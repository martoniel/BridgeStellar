use soroban_sdk::contracterror;

#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord)]
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
}
