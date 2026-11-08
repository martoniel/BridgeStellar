use super::*;
use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::token::{StellarAssetClient, TokenClient};
use soroban_sdk::{Address, Env, String};

const MATURITY_OFFSET: u64 = 1_000;

struct Fixture {
    env: Env,
    contract: Address,
    token: Address,
    creator: Address,
    buyer: Address,
}

impl Fixture {
    fn new() -> Self {
        let env = Env::default();
        env.mock_all_auths();

        let contract = env.register(FactBridge, ());
        let admin = Address::generate(&env);
        let sac = env.register_stellar_asset_contract_v2(admin);
        let token = sac.address();

        let creator = Address::generate(&env);
        let buyer = Address::generate(&env);

        Fixture {
            env,
            contract,
            token,
            creator,
            buyer,
        }
    }

    fn client(&self) -> FactBridgeClient<'_> {
        FactBridgeClient::new(&self.env, &self.contract)
    }

    fn mint(&self, to: &Address, amount: i128) {
        StellarAssetClient::new(&self.env, &self.token).mint(to, &amount);
    }

    fn balance(&self, of: &Address) -> i128 {
        TokenClient::new(&self.env, &self.token).balance(of)
    }

    fn create(&self, amount: i128, shares: u32, discount_bps: u32) -> u64 {
        self.client().create_invoice(
            &self.creator,
            &self.buyer,
            &self.token,
            &amount,
            &String::from_str(&self.env, "USDC"),
            &shares,
            &(self.env.ledger().timestamp() + MATURITY_OFFSET),
            &String::from_str(&self.env, "ipfs://QmInvoice"),
            &discount_bps,
        )
    }

    fn advance(&self, seconds: u64) {
        let now = self.env.ledger().timestamp();
        self.env.ledger().with_mut(|li| {
            li.timestamp = now + seconds;
        });
    }

    fn advance_past_maturity(&self) {
        self.advance(MATURITY_OFFSET + 1);
    }
}

#[test]
fn create_invoice_stores_metadata_and_computes_funding_target() {
    let f = Fixture::new();
    let id = f.create(1_000_0000000, 100, 500);

    assert_eq!(id, 1);

    let invoice = f.client().get_invoice(&id);
    assert_eq!(invoice.creator, f.creator);
    assert_eq!(invoice.buyer, f.buyer);
    assert_eq!(invoice.token, f.token);
    assert_eq!(invoice.amount, 1_000_0000000);
    assert_eq!(invoice.funding_target, 950_0000000);
    assert_eq!(invoice.funded_amount, 0);
    assert_eq!(invoice.status, InvoiceStatus::Created);
    assert_eq!(invoice.shares_total, 100);
    assert_eq!(invoice.shares_sold, 0);
    assert_eq!(invoice.discount_bps, 500);
    assert_eq!(invoice.metadata_uri, String::from_str(&f.env, "ipfs://QmInvoice"));
}

#[test]
fn create_invoice_requires_creator_auth() {
    let env = Env::default();
    let contract = env.register(FactBridge, ());
    let admin = Address::generate(&env);
    let token = env.register_stellar_asset_contract_v2(admin).address();
    let client = FactBridgeClient::new(&env, &contract);

    let result = client.try_create_invoice(
        &Address::generate(&env),
        &Address::generate(&env),
        &token,
        &1_000i128,
        &String::from_str(&env, "USDC"),
        &10u32,
        &(env.ledger().timestamp() + 100),
        &String::from_str(&env, "ipfs://QmInvoice"),
        &0u32,
    );

    assert!(result.is_err());
}

#[test]
fn create_invoice_rejects_invalid_inputs() {
    let f = Fixture::new();
    let client = f.client();
    let c = &f.creator;
    let b = &f.buyer;
    let t = &f.token;
    let d = String::from_str(&f.env, "USDC");
    let m = String::from_str(&f.env, "ipfs://QmInvoice");
    let maturity = f.env.ledger().timestamp() + MATURITY_OFFSET;

    assert!(matches!(
        client.try_create_invoice(c, b, t, &0i128, &d, &10u32, &maturity, &m, &0u32),
        Err(Ok(FactBridgeError::InvalidAmount))
    ));
    assert!(matches!(
        client.try_create_invoice(c, b, t, &1_000i128, &d, &0u32, &maturity, &m, &0u32),
        Err(Ok(FactBridgeError::InvalidAmount))
    ));
    assert!(matches!(
        client.try_create_invoice(c, b, t, &1_000i128, &d, &10u32, &0u64, &m, &0u32),
        Err(Ok(FactBridgeError::InvalidAmount))
    ));
    assert!(matches!(
        client.try_create_invoice(
            c,
            b,
            t,
            &1_000i128,
            &d,
            &10u32,
            &maturity,
            &String::from_str(&f.env, ""),
            &0u32
        ),
        Err(Ok(FactBridgeError::InvalidMetadata))
    ));
    assert!(matches!(
        client.try_create_invoice(c, b, t, &1_000i128, &d, &10u32, &maturity, &m, &10_000u32),
        Err(Ok(FactBridgeError::InvalidDiscount))
    ));
    assert!(matches!(
        client.try_create_invoice(c, c, t, &1_000i128, &d, &10u32, &maturity, &m, &0u32),
        Err(Ok(FactBridgeError::InvalidParties))
    ));
}

#[test]
fn fund_invoice_pays_creator_and_allocates_shares() {
    let f = Fixture::new();
    let funder = Address::generate(&f.env);
    let id = f.create(1_000_0000000, 100, 0);
    f.mint(&funder, 1_000_0000000);

    let before = f.balance(&funder);
    let invoice = f.client().fund_invoice(&funder, &id, &500_0000000);

    assert_eq!(f.balance(&funder), before - 500_0000000);
    assert_eq!(f.balance(&f.creator), 500_0000000);
    assert_eq!(f.balance(&f.contract), 0);
    assert_eq!(invoice.funded_amount, 500_0000000);
    assert_eq!(invoice.shares_sold, 50);
    assert_eq!(invoice.status, InvoiceStatus::Created);

    let position = f.client().get_position(&id, &funder);
    assert_eq!(position.contributed, 500_0000000);
    assert_eq!(position.shares, 50);
}

#[test]
fn fund_invoice_full_marks_funded() {
    let f = Fixture::new();
    let funder = Address::generate(&f.env);
    let id = f.create(1_000_0000000, 100, 0);
    f.mint(&funder, 1_000_0000000);

    let invoice = f.client().fund_invoice(&funder, &id, &1_000_0000000);

    assert_eq!(invoice.funded_amount, 1_000_0000000);
    assert_eq!(invoice.shares_sold, 100);
    assert_eq!(invoice.status, InvoiceStatus::Funded);
}

#[test]
fn fund_invoice_rejects_overfunding_and_late_funding() {
    let f = Fixture::new();
    let funder = Address::generate(&f.env);
    let id = f.create(1_000_0000000, 100, 0);
    f.mint(&funder, 2_000_0000000);

    assert!(matches!(
        f.client().try_fund_invoice(&funder, &id, &1_000_0000001),
        Err(Ok(FactBridgeError::InvalidAmount))
    ));

    f.client().fund_invoice(&funder, &id, &1_000_0000000);

    assert!(matches!(
        f.client().try_fund_invoice(&funder, &id, &1i128),
        Err(Ok(FactBridgeError::InvoiceNotFundable))
    ));
}

#[test]
fn fund_invoice_fails_without_token_balance() {
    let f = Fixture::new();
    let funder = Address::generate(&f.env);
    let id = f.create(1_000_0000000, 100, 0);

    let result = f.client().try_fund_invoice(&funder, &id, &100_0000000);
    assert!(result.is_err());
}

#[test]
fn purchase_shares_charges_proportional_principal() {
    let f = Fixture::new();
    let investor = Address::generate(&f.env);
    // Face 1,000; 5% discount -> target 950. 25 of 100 shares costs 237.5 -> 238.
    let id = f.create(1_000_0000000, 100, 500);
    f.mint(&investor, 1_000_0000000);

    let invoice = f.client().purchase_shares(&investor, &id, &25u32);

    assert_eq!(invoice.shares_sold, 25);
    assert_eq!(invoice.funded_amount, 237_5000000);
    assert_eq!(f.balance(&investor), 1_000_0000000 - 237_5000000);
    assert_eq!(f.balance(&f.creator), 237_5000000);
    assert_eq!(f.balance(&f.contract), 0);
}

#[test]
fn purchase_shares_last_buyer_gets_remaining_shares() {
    let f = Fixture::new();
    let investor = Address::generate(&f.env);
    let id = f.create(1_000_0000000, 30, 300);
    f.mint(&investor, 1_000_0000000);

    let invoice = f.client().purchase_shares(&investor, &id, &30u32);

    assert_eq!(invoice.shares_sold, 30);
    assert_eq!(invoice.funded_amount, invoice.funding_target);
    assert_eq!(invoice.status, InvoiceStatus::Funded);
}

#[test]
fn purchase_shares_rejects_creator_and_exhaustion() {
    let f = Fixture::new();
    let investor = Address::generate(&f.env);
    let id = f.create(1_000_0000000, 10, 0);
    f.mint(&investor, 1_000_0000000);

    assert!(matches!(
        f.client().try_purchase_shares(&f.creator, &id, &1u32),
        Err(Ok(FactBridgeError::NotBuyer))
    ));

    f.client().purchase_shares(&investor, &id, &10u32);

    assert!(matches!(
        f.client().try_purchase_shares(&investor, &id, &1u32),
        Err(Ok(FactBridgeError::InvoiceNotFundable))
    ));
}

#[test]
fn settlement_pays_face_value_to_single_funder() {
    let f = Fixture::new();
    let funder = Address::generate(&f.env);
    // 5% discount: funder escrows 950 and receives 1,000 at maturity.
    let id = f.create(1_000_0000000, 100, 500);
    f.mint(&funder, 950_0000000);
    f.client().fund_invoice(&funder, &id, &950_0000000);
    f.mint(&f.buyer, 1_000_0000000);

    f.advance_past_maturity();
    let invoice = f.client().settle_invoice(&f.buyer, &id);

    assert_eq!(invoice.status, InvoiceStatus::Settled);
    assert_eq!(f.balance(&funder), 1_000_0000000);
    assert_eq!(f.balance(&f.creator), 950_0000000);
    assert_eq!(f.balance(&f.buyer), 0);
    assert_eq!(f.balance(&f.contract), 0);
}

#[test]
fn settlement_distributes_pro_rata_across_funders() {
    let f = Fixture::new();
    let alice = Address::generate(&f.env);
    let bob = Address::generate(&f.env);
    let id = f.create(1_000_0000000, 100, 0);

    f.mint(&alice, 600_0000000);
    f.mint(&bob, 400_0000000);
    f.client().fund_invoice(&alice, &id, &600_0000000);
    f.client().fund_invoice(&bob, &id, &400_0000000);

    f.mint(&f.buyer, 1_000_0000000);
    f.advance_past_maturity();
    f.client().settle_invoice(&f.buyer, &id);

    assert_eq!(f.balance(&alice), 600_0000000);
    assert_eq!(f.balance(&bob), 400_0000000);
    assert_eq!(f.balance(&f.creator), 1_000_0000000);
    assert_eq!(f.balance(&f.contract), 0);
    assert_eq!(f.client().get_funders(&id).len(), 2);
}

#[test]
fn settlement_rejects_unfunded_invoice() {
    let f = Fixture::new();
    let funder = Address::generate(&f.env);
    let id = f.create(1_000_0000000, 100, 0);
    f.mint(&funder, 1_000_0000000);
    f.client().fund_invoice(&funder, &id, &500_0000000);
    f.mint(&f.buyer, 1_000_0000000);

    f.advance_past_maturity();

    assert!(matches!(
        f.client().try_settle_invoice(&f.buyer, &id),
        Err(Ok(FactBridgeError::NotFullyFunded))
    ));
}

#[test]
fn settlement_rejects_early_wrong_caller_and_double_settle() {
    let f = Fixture::new();
    let funder = Address::generate(&f.env);
    let id = f.create(1_000_0000000, 100, 0);
    f.mint(&funder, 1_000_0000000);
    f.client().fund_invoice(&funder, &id, &1_000_0000000);
    f.mint(&f.buyer, 2_000_0000000);

    assert!(matches!(
        f.client().try_settle_invoice(&f.buyer, &id),
        Err(Ok(FactBridgeError::MaturityNotReached))
    ));

    let stranger = Address::generate(&f.env);
    f.advance_past_maturity();
    assert!(matches!(
        f.client().try_settle_invoice(&stranger, &id),
        Err(Ok(FactBridgeError::NotBuyer))
    ));

    f.client().settle_invoice(&f.buyer, &id);
    assert!(matches!(
        f.client().try_settle_invoice(&f.buyer, &id),
        Err(Ok(FactBridgeError::InvoiceAlreadySettled))
    ));
}

#[test]
fn default_requires_grace_period_and_is_permissionless_afterwards() {
    let f = Fixture::new();
    let funder = Address::generate(&f.env);
    let id = f.create(1_000_0000000, 100, 0);
    f.mint(&funder, 1_000_0000000);
    f.client().fund_invoice(&funder, &id, &1_000_0000000);

    f.advance_past_maturity();
    let stranger = Address::generate(&f.env);
    assert!(matches!(
        f.client().try_default_invoice(&stranger, &id),
        Err(Ok(FactBridgeError::GracePeriodActive))
    ));

    f.advance(DEFAULT_GRACE_PERIOD);
    let invoice = f.client().default_invoice(&stranger, &id);
    assert_eq!(invoice.status, InvoiceStatus::Defaulted);
}

#[test]
fn settled_invoice_cannot_default() {
    let f = Fixture::new();
    let funder = Address::generate(&f.env);
    let id = f.create(1_000_0000000, 100, 0);
    f.mint(&funder, 1_000_0000000);
    f.client().fund_invoice(&funder, &id, &1_000_0000000);
    f.mint(&f.buyer, 1_000_0000000);
    f.advance_past_maturity();
    f.client().settle_invoice(&f.buyer, &id);

    let stranger = Address::generate(&f.env);
    assert!(matches!(
        f.client().try_default_invoice(&stranger, &id),
        Err(Ok(FactBridgeError::InvoiceAlreadySettled))
    ));
}

#[test]
fn views_return_zero_position_and_invoice_list() {
    let f = Fixture::new();
    let unknown = Address::generate(&f.env);
    let first = f.create(1_000_0000000, 100, 0);
    let second = f.create(2_000_0000000, 200, 0);

    let position = f.client().get_position(&first, &unknown);
    assert_eq!(position.contributed, 0);
    assert_eq!(position.shares, 0);
    assert_eq!(f.client().get_funders(&first).len(), 0);
    assert_eq!(f.client().get_invoice_count(), 2);
    assert_eq!(f.client().get_invoice_list(), soroban_sdk::vec![&f.env, first, second]);
    assert_eq!(second, 2);
}

#[test]
fn unknown_invoice_returns_not_found() {
    let f = Fixture::new();
    assert!(matches!(
        f.client().try_get_invoice(&999u64),
        Err(Ok(FactBridgeError::NotFound))
    ));
}
