"""Premium calculation engine — matches TD Certificate of Insurance pages 27–39 exactly.

Ported verbatim from src/utils/calculator.ts.
"""

from typing import List

from .rates import PROVINCIAL_TAX_RATES, get_ci_rate, get_life_rate
from .types import (
    BorrowerInput,
    BorrowerResult,
    CalculationResult,
    CalculatorInput,
    CoverageResult,
    PortionDetail,
    TermPortionInput,
    ValidationError,
)


# Step 1: Premium Rate Reduction.
# Tiered: first $150k = 0%, $150k–$500k slice = 15%, $500k–$1M slice = 35%.
def calc_rate_reduction(total_insured_balance: float) -> float:
    if total_insured_balance <= 150_000:
        return 0.0
    if total_insured_balance <= 500_000:
        return ((total_insured_balance - 150_000) * 0.15) / total_insured_balance
    return ((350_000 * 0.15) + (total_insured_balance - 500_000) * 0.35) / total_insured_balance


def _calc_portion_premium(
    rate: float,
    balance: float,
    insured_pct: float,
    billing_days: int,
    rate_reduction_pct: float,
    multi_insured_discount: bool,
    tax_rate: float,
) -> PortionDetail:
    base = (rate * balance) / 1_000
    insured = base * insured_pct
    daily = (insured * 12) / 365
    monthly = daily * billing_days
    after_rate_reduction = monthly * (1 - rate_reduction_pct)
    after_multi_insured = after_rate_reduction * 0.80 if multi_insured_discount else after_rate_reduction
    after_tax = after_multi_insured * (1 + tax_rate)

    return PortionDetail(
        label="",
        balance=balance,
        rate=rate,
        base_monthly=monthly,
        after_rate_reduction=after_rate_reduction,
        after_multi_insured=after_multi_insured,
        after_tax=after_tax,
    )


def _build_coverage_result(
    coverage_type: str,
    rate_reduction_pct: float,
    multi_insured_discount_applied: bool,
    portions: List[PortionDetail],
) -> CoverageResult:
    subtotal_before_tax = sum(p.after_multi_insured for p in portions)
    tax_amount = sum(p.after_tax - p.after_multi_insured for p in portions)
    total = sum(p.after_tax for p in portions)
    return CoverageResult(
        type=coverage_type,  # type: ignore[arg-type]
        rate_reduction_pct=rate_reduction_pct,
        multi_insured_discount_applied=multi_insured_discount_applied,
        portions=portions,
        subtotal_before_tax=subtotal_before_tax,
        tax_amount=tax_amount,
        total=total,
    )


def _calculate_borrower_premium(
    borrower: BorrowerInput,
    borrower_index: int,
    label: str,
    term_portions: List[TermPortionInput],
    revolving_balance: float,
    is_multi_insured: bool,
    billing_days: int,
    tax_rate: float,
) -> BorrowerResult:
    insured_pct = borrower.insured_benefit_pct / 100
    use_discount = is_multi_insured

    # Step 1: Total insured balance → rate reduction (per-borrower, uses their own insured %).
    term_insured = sum(tp.initial_amount * insured_pct for tp in term_portions)
    revolving_insured = revolving_balance * insured_pct
    total_insured_balance = term_insured + revolving_insured
    rate_reduction_pct = calc_rate_reduction(total_insured_balance)

    coverages: List[CoverageResult] = []
    tp_count = len(term_portions)

    # ── Life Insurance ──────────────────────────────────────────────────────
    life_portions: List[PortionDetail] = []

    for i, tp in enumerate(term_portions):
        if tp.initial_amount > 0:
            raw_age = (
                tp.ages_at_term_start[borrower_index]
                if borrower_index < len(tp.ages_at_term_start)
                else borrower.age
            )
            age_at_start = max(18, min(69, raw_age))
            term_rate = get_life_rate(age_at_start)
            portion = _calc_portion_premium(
                term_rate,
                tp.initial_amount,
                insured_pct,
                billing_days,
                rate_reduction_pct,
                use_discount,
                tax_rate,
            )
            portion.label = f"Term Portion {i + 1}" if tp_count > 1 else "Term Portion"
            life_portions.append(portion)

    if revolving_balance > 0:
        rev_rate = get_life_rate(borrower.age)
        portion = _calc_portion_premium(
            rev_rate,
            revolving_balance,
            insured_pct,
            billing_days,
            rate_reduction_pct,
            use_discount,
            tax_rate,
        )
        portion.label = "Revolving Portion"
        life_portions.append(portion)

    if life_portions:
        coverages.append(
            _build_coverage_result("Life Insurance", rate_reduction_pct, use_discount, life_portions)
        )

    # ── Critical Illness Insurance ──────────────────────────────────────────
    if borrower.has_critical_illness and borrower.age <= 55:
        ci_portions: List[PortionDetail] = []

        for i, tp in enumerate(term_portions):
            if tp.initial_amount > 0:
                raw_age = (
                    tp.ages_at_term_start[borrower_index]
                    if borrower_index < len(tp.ages_at_term_start)
                    else borrower.age
                )
                age_at_start = max(18, min(55, raw_age))
                term_rate = get_ci_rate(age_at_start)
                portion = _calc_portion_premium(
                    term_rate,
                    tp.initial_amount,
                    insured_pct,
                    billing_days,
                    rate_reduction_pct,
                    use_discount,
                    tax_rate,
                )
                portion.label = f"Term Portion {i + 1}" if tp_count > 1 else "Term Portion"
                ci_portions.append(portion)

        if revolving_balance > 0:
            rev_rate = get_ci_rate(borrower.age)
            portion = _calc_portion_premium(
                rev_rate,
                revolving_balance,
                insured_pct,
                billing_days,
                rate_reduction_pct,
                use_discount,
                tax_rate,
            )
            portion.label = "Revolving Portion"
            ci_portions.append(portion)

        if ci_portions:
            coverages.append(
                _build_coverage_result(
                    "Critical Illness Insurance",
                    rate_reduction_pct,
                    use_discount,
                    ci_portions,
                )
            )

    subtotal = sum(c.total for c in coverages)
    return BorrowerResult(
        label=label,
        age=borrower.age,
        total_insured_balance=total_insured_balance,
        rate_reduction_pct=rate_reduction_pct,
        coverages=coverages,
        subtotal=subtotal,
    )


def calculate_premium(input: CalculatorInput) -> CalculationResult:
    tax_rate = PROVINCIAL_TAX_RATES.get(input.province, 0.0)
    is_multi_insured = len(input.borrowers) >= 2

    borrower_results: List[BorrowerResult] = [
        _calculate_borrower_premium(
            borrower,
            i,
            f"Borrower {i + 1}" if len(input.borrowers) > 1 else "",
            input.term_portions,
            input.revolving_balance,
            is_multi_insured,
            input.billing_days,
            tax_rate,
        )
        for i, borrower in enumerate(input.borrowers)
    ]

    has_historical_term_portions = any(
        (
            i < len(tp.ages_at_term_start)
            and tp.ages_at_term_start[i] > 0
            and b.age > 0
            and tp.ages_at_term_start[i] < b.age
        )
        for tp in input.term_portions
        for i, b in enumerate(input.borrowers)
    )

    grand_total = sum(b.subtotal for b in borrower_results)
    return CalculationResult(
        province=input.province,
        billing_days=input.billing_days,
        tax_rate=tax_rate,
        is_multi_insured=is_multi_insured,
        borrower_results=borrower_results,
        grand_total=grand_total,
        has_historical_term_portions=has_historical_term_portions,
    )


# Returns the minimum insured benefit % for a given plan limit. TD requires at
# least $300,000 insured; below that, partial coverage is unavailable.
def min_insured_benefit_pct(plan_limit: float) -> int:
    if plan_limit <= 0 or plan_limit < 300_000:
        return 100
    import math

    return math.ceil((300_000 / plan_limit) * 100)


# ── Validation ──────────────────────────────────────────────────────────────
def validate_input(input: CalculatorInput) -> List[ValidationError]:
    errors: List[ValidationError] = []

    if not input.province:
        errors.append(ValidationError("province", "Please select a province."))
    if input.billing_days < 28 or input.billing_days > 31:
        errors.append(ValidationError("billingDays", "Billing days must be between 28 and 31."))

    if not input.plan_limit or input.plan_limit <= 0:
        errors.append(ValidationError("planLimit", "Please enter the FlexLine plan limit."))

    min_pct = min_insured_benefit_pct(input.plan_limit)
    multi = len(input.borrowers) > 1
    for i, b in enumerate(input.borrowers):
        tag = f"Borrower {i + 1}: " if multi else ""
        if b.age < 18 or b.age > 69:
            errors.append(ValidationError(f"b{i}.age", f"{tag}Age must be between 18 and 69."))
        if b.has_critical_illness and b.age > 55:
            errors.append(
                ValidationError(f"b{i}.age", f"{tag}CI Insurance is only available for ages 18–55.")
            )
        if b.insured_benefit_pct < min_pct or b.insured_benefit_pct > 100:
            if 0 < input.plan_limit < 300_000:
                errors.append(
                    ValidationError(
                        f"b{i}.insuredPct",
                        f"{tag}Partial coverage is not available — plan limit is below $300,000.",
                    )
                )
            elif input.plan_limit >= 300_000:
                errors.append(
                    ValidationError(
                        f"b{i}.insuredPct",
                        f"{tag}Insured Benefit must be between {min_pct}% and 100% "
                        f"(minimum $300,000 on a {format_cad(input.plan_limit)} plan).",
                    )
                )
            else:
                errors.append(
                    ValidationError(
                        f"b{i}.insuredPct",
                        f"{tag}Insured Benefit must be between 1% and 100%.",
                    )
                )

    for i, tp in enumerate(input.term_portions):
        if tp.initial_amount <= 0:
            errors.append(
                ValidationError(
                    f"tp.{i}.amount",
                    f"Term Portion {i + 1}: initial amount must be greater than $0.",
                )
            )
        for j, b in enumerate(input.borrowers):
            borrower_tag = f"Borrower {j + 1} " if multi else ""
            age_at_start = tp.ages_at_term_start[j] if j < len(tp.ages_at_term_start) else 0
            if not age_at_start or age_at_start < 18 or age_at_start > 69:
                errors.append(
                    ValidationError(
                        f"tp.{i}.age.{j}",
                        f"Term Portion {i + 1}: {borrower_tag}age at term start must be between 18 and 69.",
                    )
                )
            elif b.age >= 18 and age_at_start > b.age:
                errors.append(
                    ValidationError(
                        f"tp.{i}.age.{j}",
                        f"Term Portion {i + 1}: {borrower_tag}age at term start ({age_at_start}) "
                        f"cannot exceed current age ({b.age}).",
                    )
                )

    if input.revolving_balance < 0:
        errors.append(ValidationError("revolving", "Revolving balance cannot be negative."))
    if not input.term_portions and input.revolving_balance <= 0:
        errors.append(
            ValidationError(
                "coverage",
                "Please add at least one Term Portion or enter a Revolving Portion balance.",
            )
        )

    total_balance = sum(tp.initial_amount for tp in input.term_portions) + input.revolving_balance
    if input.plan_limit > 0 and total_balance > input.plan_limit:
        errors.append(
            ValidationError(
                "totalLimit",
                f"Total balance ({format_cad(total_balance)}) cannot exceed the plan limit "
                f"({format_cad(input.plan_limit)}).",
            )
        )
    if total_balance > 1_000_000:
        errors.append(
            ValidationError("totalLimit", "Total insured amount cannot exceed $1,000,000.")
        )

    return errors


def format_cad(amount: float) -> str:
    # en-CA style: $1,234.56
    return f"${amount:,.2f}"


def format_pct(pct: float) -> str:
    return f"{pct * 100:.4f}%"
