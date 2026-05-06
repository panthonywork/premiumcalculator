from dataclasses import dataclass, field
from typing import List, Literal


@dataclass
class TermPortionInput:
    initial_amount: float
    ages_at_term_start: List[int]


@dataclass
class BorrowerInput:
    age: int
    has_critical_illness: bool
    insured_benefit_pct: float


@dataclass
class CalculatorInput:
    province: str
    billing_days: int
    plan_limit: float
    borrowers: List[BorrowerInput]
    term_portions: List[TermPortionInput]
    revolving_balance: float


@dataclass
class PortionDetail:
    label: str
    balance: float
    rate: float
    base_monthly: float
    after_rate_reduction: float
    after_multi_insured: float
    after_tax: float


CoverageType = Literal["Life Insurance", "Critical Illness Insurance"]


@dataclass
class CoverageResult:
    type: CoverageType
    rate_reduction_pct: float
    multi_insured_discount_applied: bool
    portions: List[PortionDetail]
    subtotal_before_tax: float
    tax_amount: float
    total: float


@dataclass
class BorrowerResult:
    label: str
    age: int
    total_insured_balance: float
    rate_reduction_pct: float
    coverages: List[CoverageResult]
    subtotal: float


@dataclass
class CalculationResult:
    province: str
    billing_days: int
    tax_rate: float
    is_multi_insured: bool
    borrower_results: List[BorrowerResult]
    grand_total: float
    has_historical_term_portions: bool


@dataclass
class ValidationError:
    field: str
    message: str
