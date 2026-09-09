use soroban_sdk::{contracttype, Address, String};

#[derive(Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
#[contracttype]
pub enum InvoiceStatus {
    Created = 0,
    Funded = 1,
    Settled = 2,
    Defaulted = 3,
    Disputed = 4,
}

#[derive(Clone)]
#[contracttype]
pub struct InvoiceToken {
    pub id: u64,
    pub creator: Address,
    pub buyer: Address,
    pub amount: i128,
    pub denom: String,
    pub status: InvoiceStatus,
    pub funded_amount: i128,
    pub shares_total: u32,
    pub shares_sold: u32,
    pub created_at: u64,
    pub maturity_date: u64,
    pub metadata_uri: String,
}
