use soroban_sdk::contracterror;

#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Debug)]
#[contracterror]
pub enum FactBridgeError {
    NotFound = 1,
    AlreadyExists = 2,
    Unauthorized = 3,
    InvalidAmount = 4,
    InsufficientFunds = 5,
    InvoiceNotMature = 6,
    InvoiceAlreadySettled = 7,
    InvoiceAlreadyDefaulted = 8,
    SharesExhausted = 9,
    MaturityNotReached = 10,
    NotCreator = 11,
    NotBuyer = 12,
    SettlementFailed = 13,
    Overflow = 14,
    InvalidMetadata = 15,
    /// Settlement requires the invoice to be fully funded first.
    NotFullyFunded = 16,
    /// Discount must be strictly below 10,000 basis points.
    InvalidDiscount = 17,
    /// Invoice is no longer accepting funding (settled, defaulted or disputed).
    InvoiceNotFundable = 18,
    /// Default can only be declared after the maturity date plus grace period.
    GracePeriodActive = 19,
    /// The two addresses must be different.
    InvalidParties = 20,
    /// Settlement-distribution loop is capped; invoice already has too many funders.
    TooManyFunders = 21,
}
