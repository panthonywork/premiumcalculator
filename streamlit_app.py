"""TD FlexLine Protection Plan — Premium Quote Calculator (Streamlit).

Internal tool for TD advisors. Mirrors the React/Vite version, ported to
Python/Streamlit so it can be hosted on Streamlit Cloud alongside other
internal apps.
"""

from __future__ import annotations

import streamlit as st

from flexline.calculator import (
    calculate_premium,
    format_cad,
    format_pct,
    min_insured_benefit_pct,
    validate_input,
)
from flexline.rates import PROVINCES
from flexline.types import (
    BorrowerInput,
    CalculatorInput,
    TermPortionInput,
)


# ── Page setup ──────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="TD FlexLine Premium Calculator",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# TD-branded styling.
st.markdown(
    """
    <style>
    /* Hide default Streamlit chrome */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}

    /* TD brand colors */
    :root {
        --td-green: #00843D;
        --td-green-dark: #006B31;
        --td-green-light: #E5F2EB;
        --td-green-muted: #B8DCC7;
    }

    /* Header banner */
    .td-header {
        background-color: #00843D;
        color: white;
        padding: 1.25rem 1.5rem;
        border-radius: 0.5rem;
        margin-bottom: 1.25rem;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .td-header h1 {
        color: white !important;
        margin: 0 !important;
        font-size: 1.5rem !important;
        font-weight: 700 !important;
    }
    .td-header p {
        color: #DCEEDF !important;
        margin: 0.15rem 0 0 0 !important;
        font-size: 0.875rem !important;
    }

    /* Section card headers */
    .td-section-title {
        color: #00843D;
        font-weight: 600;
        font-size: 1rem;
        padding-bottom: 0.4rem;
        border-bottom: 1px solid #B8DCC7;
        margin-bottom: 0.85rem;
    }

    /* Grand-total banner */
    .td-total-banner {
        background-color: #00843D;
        color: white;
        padding: 1.5rem 1.5rem 1.25rem 1.5rem;
        border-radius: 0.5rem;
        margin-bottom: 1rem;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .td-total-banner .label {
        color: #DCEEDF;
        font-size: 0.875rem;
        font-weight: 500;
        margin: 0;
    }
    .td-total-banner .amount {
        color: white;
        font-size: 2.25rem;
        font-weight: 700;
        letter-spacing: -0.025em;
        margin: 0.15rem 0 0.3rem 0;
        line-height: 1.1;
    }
    .td-total-banner .meta {
        color: #B8DCC7;
        font-size: 0.75rem;
        margin: 0;
    }

    /* Disclosure boxes */
    .td-disclosure {
        background-color: #FFFBEB;
        border: 1px solid #FCD34D;
        border-radius: 0.5rem;
        padding: 0.85rem 1rem;
        margin-top: 1rem;
    }
    .td-disclosure p { margin: 0 0 0.4rem 0; color: #92400E; font-size: 0.78rem; font-weight: 600; }
    .td-disclosure ul { margin: 0; padding-left: 1.1rem; color: #B45309; font-size: 0.75rem; }
    .td-disclosure li { margin-bottom: 0.2rem; line-height: 1.5; }

    /* Reduce vertical gap between widgets */
    .block-container { padding-top: 1.5rem; padding-bottom: 2rem; }

    /* Borrower / term-portion subcards */
    .td-subcard {
        background-color: #F9FAFB;
        border: 1px solid #E5E7EB;
        border-radius: 0.5rem;
        padding: 0.85rem 1rem;
        margin-bottom: 0.65rem;
    }
    .td-multi-discount {
        background-color: #E5F2EB;
        border: 1px solid #B8DCC7;
        color: #006B31;
        border-radius: 0.5rem;
        padding: 0.6rem 0.85rem;
        font-size: 0.8rem;
        margin-top: 0.5rem;
    }

    /* Tighter dataframe / table */
    [data-testid="stDataFrame"] { font-size: 0.85rem; }
    </style>
    """,
    unsafe_allow_html=True,
)


# ── Header ──────────────────────────────────────────────────────────────────
st.markdown(
    """
    <div class="td-header">
        <h1>FlexLine Protection Plan</h1>
        <p>Premium Quote Calculator — Advisor Use Only</p>
    </div>
    """,
    unsafe_allow_html=True,
)


# ── Session state ───────────────────────────────────────────────────────────
def _default_borrower() -> dict:
    return {"age": 0, "has_critical_illness": False, "insured_benefit_pct": 100}


if "borrowers" not in st.session_state:
    st.session_state.borrowers = [_default_borrower()]
if "term_portions" not in st.session_state:
    st.session_state.term_portions = []
if "result" not in st.session_state:
    st.session_state.result = None
if "errors" not in st.session_state:
    st.session_state.errors = []


def _add_borrower():
    if len(st.session_state.borrowers) >= 4:
        return
    st.session_state.borrowers.append(_default_borrower())
    for tp in st.session_state.term_portions:
        tp["ages_at_term_start"].append(0)


def _remove_borrower(idx: int):
    if len(st.session_state.borrowers) <= 1:
        return
    st.session_state.borrowers.pop(idx)
    for tp in st.session_state.term_portions:
        if idx < len(tp["ages_at_term_start"]):
            tp["ages_at_term_start"].pop(idx)


def _add_term_portion():
    st.session_state.term_portions.append(
        {
            "initial_amount": 0.0,
            "ages_at_term_start": [0] * len(st.session_state.borrowers),
        }
    )


def _remove_term_portion(idx: int):
    st.session_state.term_portions.pop(idx)


def _reset():
    st.session_state.borrowers = [_default_borrower()]
    st.session_state.term_portions = []
    st.session_state.result = None
    st.session_state.errors = []


# ── Helpers ─────────────────────────────────────────────────────────────────
def _md_cad(amount: float) -> str:
    # Streamlit markdown treats '$...$' as LaTeX math — escape so currency
    # values render as plain text.
    return format_cad(amount).replace("$", "\\$")


def _render_coverage(coverage):
    """Render a single coverage type's premium breakdown table."""
    show_discount = coverage.multi_insured_discount_applied
    badge = ""
    if show_discount:
        badge = " &nbsp;<span style='background:#FFFFFF; color:#374151; font-size:0.7rem; padding:0.1rem 0.4rem; border-radius:0.25rem;'>−20% multi-insured discount applied</span>"
    bg = "#EFF6FF" if coverage.type == "Critical Illness Insurance" else "#E5F2EB"
    fg = "#1E40AF" if coverage.type == "Critical Illness Insurance" else "#00843D"
    st.markdown(
        f"""
        <div style="background:{bg}; color:{fg}; padding:0.45rem 0.75rem; font-weight:700;
             font-size:0.8rem; border-radius:0.4rem 0.4rem 0 0;">
            {coverage.type}{badge}
        </div>
        """,
        unsafe_allow_html=True,
    )

    # Build the row data.
    rows = []
    for p in coverage.portions:
        row = {
            "Portion": p.label,
            "Balance": format_cad(p.balance),
            "Rate/$1k": f"${p.rate:.2f}",
        }
        if show_discount:
            row["After 20% Discount"] = format_cad(p.after_multi_insured)
        row["Monthly Premium"] = format_cad(p.after_tax)
        rows.append(row)

    st.dataframe(rows, hide_index=True, use_container_width=True)

    footer = f"Before tax: {_md_cad(coverage.subtotal_before_tax)}"
    if coverage.tax_amount > 0:
        footer += f" + PST: {_md_cad(coverage.tax_amount)}"
    short = coverage.type.split(" ")[0]
    st.caption(
        f"{footer} &nbsp; · &nbsp; **{short} Total: {_md_cad(coverage.total)}/mo**"
    )


# ── Layout ──────────────────────────────────────────────────────────────────
left, right = st.columns([1, 1], gap="large")


# ════════════════════════════════════════════════════════════════════════════
# LEFT — INPUT FORM
# ════════════════════════════════════════════════════════════════════════════
with left:
    # ── Billing & Province ──────────────────────────────────────────────────
    with st.container(border=True):
        st.markdown('<div class="td-section-title">Billing & Province</div>', unsafe_allow_html=True)

        c1, c2 = st.columns(2)
        with c1:
            province = st.selectbox(
                "Province *",
                options=[""] + PROVINCES,
                format_func=lambda v: "Select province…" if v == "" else v,
                key="province",
            )
        with c2:
            billing_days = st.number_input(
                "Billing Period Days *",
                min_value=28,
                max_value=31,
                value=30,
                step=1,
                key="billing_days",
                help="Typically 28–31 days",
            )

    # ── FlexLine Details ───────────────────────────────────────────────────
    with st.container(border=True):
        st.markdown('<div class="td-section-title">FlexLine Details</div>', unsafe_allow_html=True)

        plan_limit = st.number_input(
            "Plan Limit ($) *",
            min_value=0.0,
            value=0.0,
            step=10_000.0,
            format="%.2f",
            key="plan_limit",
            help="Total FlexLine credit limit. Term + revolving cannot exceed this amount.",
        )

        # If plan limit drops below $300k, force every borrower's insured % to 100.
        if 0 < plan_limit < 300_000:
            for b in st.session_state.borrowers:
                b["insured_benefit_pct"] = 100

        st.markdown("**Term Portions**")
        if not st.session_state.term_portions:
            st.caption("No term portions — revolving only.")

        for i, tp in enumerate(st.session_state.term_portions):
            multi = len(st.session_state.borrowers) > 1
            label = f"Term Portion {i + 1}" if len(st.session_state.term_portions) > 1 else "Term Portion"
            with st.container(border=True):
                hdr_l, hdr_r = st.columns([4, 1])
                hdr_l.markdown(f"**{label}**")
                hdr_r.button(
                    "Remove",
                    key=f"tp_remove_{i}",
                    on_click=_remove_term_portion,
                    args=(i,),
                    type="tertiary" if hasattr(st, "button") else "secondary",
                )

                amt_col, age_col = st.columns(2)
                with amt_col:
                    tp["initial_amount"] = st.number_input(
                        "Initial Amount ($) *",
                        min_value=0.0,
                        value=float(tp["initial_amount"]),
                        step=5_000.0,
                        format="%.2f",
                        key=f"tp_{i}_amount",
                    )
                with age_col:
                    if multi:
                        st.caption("Ages at Term Start *")
                        # Make sure the age list matches the borrower count.
                        while len(tp["ages_at_term_start"]) < len(st.session_state.borrowers):
                            tp["ages_at_term_start"].append(0)
                        for j, b in enumerate(st.session_state.borrowers):
                            current = tp["ages_at_term_start"][j]
                            tp["ages_at_term_start"][j] = st.number_input(
                                f"Borrower {j + 1}",
                                min_value=0,
                                max_value=69,
                                value=int(current) if current else 0,
                                step=1,
                                key=f"tp_{i}_age_{j}",
                            )
                            current_age = b["age"]
                            ats = tp["ages_at_term_start"][j]
                            if current_age and ats and 0 < ats <= current_age:
                                yrs = current_age - ats
                                st.caption(f"{yrs} yr{'s' if yrs != 1 else ''} ago")
                        st.caption("Rate locked at each borrower's age when coverage began.")
                    else:
                        if not tp["ages_at_term_start"]:
                            tp["ages_at_term_start"] = [0]
                        ats = st.number_input(
                            "Age When Term Started *",
                            min_value=0,
                            max_value=69,
                            value=int(tp["ages_at_term_start"][0]),
                            step=1,
                            key=f"tp_{i}_age_0",
                        )
                        tp["ages_at_term_start"][0] = ats
                        current_age = st.session_state.borrowers[0]["age"]
                        if current_age and ats and 0 < ats <= current_age:
                            yrs = current_age - ats
                            st.caption(f"{yrs} yr{'s' if yrs != 1 else ''} ago · Rate fixed at this age.")
                        else:
                            st.caption("Rate fixed at this age.")

                # Historical-term notice.
                is_historical = any(
                    j < len(tp["ages_at_term_start"])
                    and tp["ages_at_term_start"][j] > 0
                    and b["age"] > 0
                    and tp["ages_at_term_start"][j] < b["age"]
                    for j, b in enumerate(st.session_state.borrowers)
                )
                if is_historical:
                    st.warning(
                        "This term portion began before the borrower's current age. "
                        "Premiums are calculated using today's published rate table at the entered "
                        "age when coverage began — actual billed amounts may vary slightly if rates "
                        "have changed since the term started.",
                        icon="⚠️",
                    )

        st.button("➕ Add Term Portion", on_click=_add_term_portion, key="add_tp_btn")

        st.markdown("&nbsp;", unsafe_allow_html=True)
        revolving_balance = st.number_input(
            "Revolving Portion — Average Daily Balance ($)",
            min_value=0.0,
            value=0.0,
            step=1_000.0,
            format="%.2f",
            key="revolving_balance",
            help="Enter $0 if no revolving balance",
        )

    # ── Borrowers ──────────────────────────────────────────────────────────
    with st.container(border=True):
        st.markdown('<div class="td-section-title">Borrowers</div>', unsafe_allow_html=True)

        partial_unavailable = 0 < plan_limit < 300_000
        min_pct = min_insured_benefit_pct(plan_limit) if plan_limit >= 300_000 else 1
        show_min_hint = plan_limit >= 300_000 and min_pct > 1

        for i, b in enumerate(st.session_state.borrowers):
            with st.container(border=True):
                hdr_l, hdr_r = st.columns([4, 1])
                hdr_l.markdown(f"**🟢 Borrower {i + 1}**")
                if len(st.session_state.borrowers) > 1:
                    hdr_r.button(
                        "Remove",
                        key=f"b_remove_{i}",
                        on_click=_remove_borrower,
                        args=(i,),
                    )

                age_col, cov_col = st.columns(2)
                with age_col:
                    b["age"] = st.number_input(
                        "Current Age *",
                        min_value=0,
                        max_value=99,
                        value=int(b["age"]),
                        step=1,
                        key=f"b_{i}_age",
                        help="Life: 18–69 · CI: 18–55",
                    )

                with cov_col:
                    ci_disabled = b["age"] > 55 or b["age"] < 18
                    options = ["Life only", "Life + CI"]
                    if ci_disabled and b["has_critical_illness"]:
                        b["has_critical_illness"] = False
                    current_choice = "Life + CI" if b["has_critical_illness"] else "Life only"
                    coverage_choice = st.radio(
                        "Coverage *",
                        options,
                        index=options.index(current_choice),
                        key=f"b_{i}_cov",
                        horizontal=False,
                        disabled=False,
                    )
                    new_has_ci = coverage_choice == "Life + CI"
                    if new_has_ci and ci_disabled:
                        st.caption(
                            f"⚠️ CI not available (age {'> 55' if b['age'] > 55 else '< 18'})"
                        )
                        b["has_critical_illness"] = False
                    else:
                        b["has_critical_illness"] = new_has_ci

                if partial_unavailable:
                    st.caption("Partial coverage not available — plan limit is below $300,000.")
                    b["insured_benefit_pct"] = 100
                else:
                    with st.expander("Partial Coverage (Insured Benefit %)"):
                        b["insured_benefit_pct"] = st.number_input(
                            "Insured Benefit %",
                            min_value=int(min_pct),
                            max_value=100,
                            value=int(b["insured_benefit_pct"]),
                            step=1,
                            key=f"b_{i}_pct",
                        )
                        if show_min_hint:
                            st.caption(f"Minimum {min_pct}% — ensures at least $300,000 insured.")
                        else:
                            st.caption("Default 100%. Change only for partial coverage approvals.")

        if len(st.session_state.borrowers) < 4:
            st.button("➕ Add Borrower", on_click=_add_borrower, key="add_b_btn")

        if len(st.session_state.borrowers) >= 2:
            st.markdown(
                f"""
                <div class="td-multi-discount">
                    ✓ <strong>20% multi-insured discount</strong> will be applied to each
                    borrower's premium ({len(st.session_state.borrowers)} borrowers on this FlexLine)
                </div>
                """,
                unsafe_allow_html=True,
            )

    # ── Validation summary ─────────────────────────────────────────────────
    if st.session_state.errors:
        with st.container(border=True):
            st.error("Please fix the following:")
            for e in st.session_state.errors:
                st.markdown(f"- {e.message}")

    # ── Actions ─────────────────────────────────────────────────────────────
    a, b = st.columns([3, 1])
    calc_clicked = a.button(
        "Calculate Premium",
        type="primary",
        use_container_width=True,
        key="calc_btn",
    )
    b.button("Reset", on_click=_reset, use_container_width=True, key="reset_btn")

    st.caption(
        "This calculator is for internal advisor use only and provides an estimate based on the "
        "information entered. Actual premiums are determined at billing and may vary based on the "
        "exact insurance billing period. Coverage is subject to underwriting approval."
    )


# ════════════════════════════════════════════════════════════════════════════
# Calculation trigger
# ════════════════════════════════════════════════════════════════════════════
if calc_clicked:
    payload = CalculatorInput(
        province=province,
        billing_days=int(billing_days),
        plan_limit=float(plan_limit),
        borrowers=[
            BorrowerInput(
                age=int(b["age"]),
                has_critical_illness=bool(b["has_critical_illness"]),
                insured_benefit_pct=float(b["insured_benefit_pct"]),
            )
            for b in st.session_state.borrowers
        ],
        term_portions=[
            TermPortionInput(
                initial_amount=float(tp["initial_amount"]),
                ages_at_term_start=[int(a) for a in tp["ages_at_term_start"]],
            )
            for tp in st.session_state.term_portions
        ],
        revolving_balance=float(revolving_balance),
    )
    errs = validate_input(payload)
    st.session_state.errors = errs
    if not errs:
        st.session_state.result = calculate_premium(payload)
    else:
        st.session_state.result = None
    st.rerun()


# ════════════════════════════════════════════════════════════════════════════
# RIGHT — RESULTS
# ════════════════════════════════════════════════════════════════════════════
with right:
    result = st.session_state.result

    if result is None:
        with st.container(border=True):
            st.markdown(
                """
                <div style="text-align:center; padding: 3rem 1rem; color:#9CA3AF;">
                    <div style="font-size: 3rem; margin-bottom: 0.5rem;">🛡️</div>
                    <p style="font-weight:600; color:#6B7280; margin:0;">Quote will appear here</p>
                    <p style="font-size:0.8rem; margin-top:0.25rem;">
                        Complete the form and click Calculate Premium
                    </p>
                </div>
                """,
                unsafe_allow_html=True,
            )
    else:
        # Grand total banner
        tax_label = (
            f" + {int(result.tax_rate * 100)}% PST" if result.tax_rate > 0 else ""
        )
        multi_meta = (
            f" · {len(result.borrower_results)} borrowers · 20% multi-insured discount"
            if result.is_multi_insured
            else ""
        )
        st.markdown(
            f"""
            <div class="td-total-banner">
                <p class="label">
                    Estimated Monthly Premium{' — Combined' if result.is_multi_insured else ''}
                </p>
                <p class="amount">{format_cad(result.grand_total)}</p>
                <p class="meta">
                    {result.province} · {result.billing_days}-day billing period{tax_label}{multi_meta}
                </p>
            </div>
            """,
            unsafe_allow_html=True,
        )

        # Summary bar
        with st.container(border=True):
            chips = []
            if result.is_multi_insured:
                for i, br in enumerate(result.borrower_results):
                    chips.append(
                        f"**B{i + 1} Insured Balance:** {_md_cad(br.total_insured_balance)}"
                    )
            else:
                chips.append(
                    f"**Total Insured Balance:** {_md_cad(result.borrower_results[0].total_insured_balance)}"
                )
            if result.tax_rate > 0:
                chips.append(f"**PST:** {int(result.tax_rate * 100)}%")
            st.markdown("&nbsp;&nbsp;|&nbsp;&nbsp;".join(chips))

        # Premium Breakdown
        with st.container(border=True):
            head_l, head_r = st.columns([5, 1])
            head_l.markdown(
                '<div class="td-section-title" style="margin-bottom:0;">Premium Breakdown</div>',
                unsafe_allow_html=True,
            )
            with head_r:
                with st.popover("ℹ️", use_container_width=True):
                    st.markdown("**Volume Rate Reduction**")
                    st.caption(
                        "TD automatically applies a tiered volume discount to premiums when the "
                        "total insured balance exceeds $150,000. It is already factored into all "
                        "premiums shown — nothing extra needs to be done."
                    )
                    st.table(
                        {
                            "Balance Tier": [
                                "$0 – $150,000",
                                "$150,001 – $500,000",
                                "$500,001 – $1,000,000",
                            ],
                            "Reduction on Slice": ["None", "15%", "35%"],
                        }
                    )
                    if any(br.rate_reduction_pct > 0 for br in result.borrower_results):
                        st.markdown("**Applied in this quote:**")
                        for br in result.borrower_results:
                            label = br.label or "Borrower"
                            st.markdown(
                                f"- **{label}** — insured balance "
                                f"{_md_cad(br.total_insured_balance)} → "
                                f"**{format_pct(br.rate_reduction_pct)} effective reduction**"
                            )
                    else:
                        st.caption(
                            "No reduction applies in this quote — the insured balance is "
                            "\\$150,000 or below."
                        )
                    st.caption("Source: TD Certificate of Insurance, pages 27–39")

            # Build the breakdown.
            if result.is_multi_insured:
                for i, br in enumerate(result.borrower_results):
                    with st.expander(
                        f"**{br.label}** · Age {br.age} · "
                        f"Insured: {_md_cad(br.total_insured_balance)} "
                        f"— **{_md_cad(br.subtotal)}/mo**",
                        expanded=False,
                    ):
                        for c in br.coverages:
                            _render_coverage(c)
            else:
                br = result.borrower_results[0]
                for c in br.coverages:
                    with st.expander(f"**{c.type}** — **{_md_cad(c.total)}/mo**", expanded=False):
                        _render_coverage(c)

        # Historical term portions notice.
        if result.has_historical_term_portions:
            st.warning(
                "**Note — historical term portions:** One or more term portions began before the "
                "borrower's current age. Premiums for those portions are calculated using today's "
                "published rate table at the age when coverage began. If TD's rate table has "
                "changed since the term started, actual billed amounts may vary slightly from "
                "this estimate.",
                icon="⚠️",
            )

        # Disclosures
        st.markdown(
            """
            <div class="td-disclosure">
                <p>Important Disclosures</p>
                <ul>
                    <li>This estimate is for advisor use only. Actual premiums may vary based on the exact insurance billing period.</li>
                    <li>Rates are per $1,000 of coverage per month. Provincial tax applied where applicable.</li>
                    <li>Life Insurance provided by The Canada Life Assurance Company. Accidental dismemberment by TD Life Insurance Company.</li>
                    <li>Coverage is subject to underwriting approval. Terms and conditions apply.</li>
                    <li>Maximum combined coverage: $1,000,000 per coverage type.</li>
                </ul>
            </div>
            """,
            unsafe_allow_html=True,
        )
