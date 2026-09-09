use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Env, String};

fn setup() -> (Env, soroban_sdk::Address) {
    let env = Env::default();
    let contract_id = env.register_contract(None, FactBridge);
    (env, contract_id)
}

#[test]
fn test_create_invoice() {
    let (env, contract_id) = setup();
    let client = FactBridgeClient::new(&env, &contract_id);
    let creator = Address::generate(&env);
    let buyer = Address::generate(&env);

    let id = client.create_invoice(
        &creator,
        &buyer,
        &1000i128,
        &String::from_str(&env, "USDC"),
        &100u32,
        &(env.ledger().timestamp() + 1000),
        &String::from_str(&env, "ipfs://Qm123"),
    );

    assert_eq!(id, 1);

    let invoice = client.get_invoice(&id);
    assert_eq!(invoice.creator, creator);
    assert_eq!(invoice.buyer, buyer);
    assert_eq!(invoice.amount, 1000i128);
    assert_eq!(invoice.status, InvoiceStatus::Created);
    assert_eq!(invoice.funded_amount, 0i128);
    assert_eq!(invoice.shares_total, 100u32);
    assert_eq!(invoice.shares_sold, 0u32);
}

#[test]
fn test_fund_invoice_partial() {
    let (env, contract_id) = setup();
    let client = FactBridgeClient::new(&env, &contract_id);
    let creator = Address::generate(&env);
    let buyer = Address::generate(&env);
    let funder = Address::generate(&env);

    env.mock_all_auths();

    let id = client.create_invoice(
        &creator,
        &buyer,
        &1000i128,
        &String::from_str(&env, "USDC"),
        &100u32,
        &(env.ledger().timestamp() + 1000),
        &String::from_str(&env, "ipfs://Qm123"),
    );

    let invoice = client.fund_invoice(&funder, &id, &500i128);
    assert_eq!(invoice.funded_amount, 500i128);
    assert_eq!(invoice.status, InvoiceStatus::Created);
}

#[test]
fn test_fund_invoice_full() {
    let (env, contract_id) = setup();
    let client = FactBridgeClient::new(&env, &contract_id);
    let creator = Address::generate(&env);
    let buyer = Address::generate(&env);
    let funder = Address::generate(&env);

    env.mock_all_auths();

    let id = client.create_invoice(
        &creator,
        &buyer,
        &1000i128,
        &String::from_str(&env, "USDC"),
        &100u32,
        &(env.ledger().timestamp() + 1000),
        &String::from_str(&env, "ipfs://Qm123"),
    );

    let invoice = client.fund_invoice(&funder, &id, &1000i128);
    assert_eq!(invoice.funded_amount, 1000i128);
    assert_eq!(invoice.status, InvoiceStatus::Funded);
}

#[test]
fn test_purchase_shares() {
    let (env, contract_id) = setup();
    let client = FactBridgeClient::new(&env, &contract_id);
    let creator = Address::generate(&env);
    let buyer = Address::generate(&env);
    let investor = Address::generate(&env);

    env.mock_all_auths();

    let id = client.create_invoice(
        &creator,
        &buyer,
        &1000i128,
        &String::from_str(&env, "USDC"),
        &100u32,
        &(env.ledger().timestamp() + 1000),
        &String::from_str(&env, "ipfs://Qm123"),
    );

    let invoice = client.purchase_shares(&investor, &id, &25u32);
    assert_eq!(invoice.shares_sold, 25u32);

    let invoice = client.purchase_shares(&investor, &id, &25u32);
    assert_eq!(invoice.shares_sold, 50u32);
}

#[test]
fn test_settle_invoice() {
    let (env, contract_id) = setup();
    let client = FactBridgeClient::new(&env, &contract_id);
    let creator = Address::generate(&env);
    let buyer = Address::generate(&env);

    env.mock_all_auths();

    let maturity = env.ledger().timestamp() + 100;
    let id = client.create_invoice(
        &creator,
        &buyer,
        &1000i128,
        &String::from_str(&env, "USDC"),
        &100u32,
        &maturity,
        &String::from_str(&env, "ipfs://Qm123"),
    );

    env.ledger().with_mut(|li| {
        li.timestamp = maturity + 1;
    });

    let invoice = client.settle_invoice(&buyer, &id);
    assert_eq!(invoice.status, InvoiceStatus::Settled);
}

#[test]
fn test_default_invoice() {
    let (env, contract_id) = setup();
    let client = FactBridgeClient::new(&env, &contract_id);
    let creator = Address::generate(&env);
    let buyer = Address::generate(&env);

    env.mock_all_auths();

    let maturity = env.ledger().timestamp() + 100;
    let id = client.create_invoice(
        &creator,
        &buyer,
        &1000i128,
        &String::from_str(&env, "USDC"),
        &100u32,
        &maturity,
        &String::from_str(&env, "ipfs://Qm123"),
    );

    env.ledger().with_mut(|li| {
        li.timestamp = maturity + 1;
    });

    let invoice = client.default_invoice(&id);
    assert_eq!(invoice.status, InvoiceStatus::Defaulted);
}

#[test]
fn test_error_create_zero_amount() {
    let (env, contract_id) = setup();
    let client = FactBridgeClient::new(&env, &contract_id);
    let creator = Address::generate(&env);
    let buyer = Address::generate(&env);

    let result = client.try_create_invoice(
        &creator,
        &buyer,
        &0i128,
        &String::from_str(&env, "USDC"),
        &100u32,
        &(env.ledger().timestamp() + 1000),
        &String::from_str(&env, "ipfs://Qm123"),
    );
    assert!(result.is_err());
}

#[test]
fn test_error_fund_over_amount() {
    let (env, contract_id) = setup();
    let client = FactBridgeClient::new(&env, &contract_id);
    let creator = Address::generate(&env);
    let buyer = Address::generate(&env);
    let funder = Address::generate(&env);

    env.mock_all_auths();

    let id = client.create_invoice(
        &creator,
        &buyer,
        &1000i128,
        &String::from_str(&env, "USDC"),
        &100u32,
        &(env.ledger().timestamp() + 1000),
        &String::from_str(&env, "ipfs://Qm123"),
    );

    let result = client.try_fund_invoice(&funder, &id, &1001i128);
    assert!(result.is_err());
}

#[test]
fn test_error_settle_before_maturity() {
    let (env, contract_id) = setup();
    let client = FactBridgeClient::new(&env, &contract_id);
    let creator = Address::generate(&env);
    let buyer = Address::generate(&env);

    env.mock_all_auths();

    let id = client.create_invoice(
        &creator,
        &buyer,
        &1000i128,
        &String::from_str(&env, "USDC"),
        &100u32,
        &(env.ledger().timestamp() + 1000),
        &String::from_str(&env, "ipfs://Qm123"),
    );

    let result = client.try_settle_invoice(&buyer, &id);
    assert!(result.is_err());
}

#[test]
fn test_error_default_before_maturity() {
    let (env, contract_id) = setup();
    let client = FactBridgeClient::new(&env, &contract_id);
    let creator = Address::generate(&env);
    let buyer = Address::generate(&env);

    env.mock_all_auths();

    let id = client.create_invoice(
        &creator,
        &buyer,
        &1000i128,
        &String::from_str(&env, "USDC"),
        &100u32,
        &(env.ledger().timestamp() + 1000),
        &String::from_str(&env, "ipfs://Qm123"),
    );

    let result = client.try_default_invoice(&id);
    assert!(result.is_err());
}

#[test]
fn test_error_shares_exhausted() {
    let (env, contract_id) = setup();
    let client = FactBridgeClient::new(&env, &contract_id);
    let creator = Address::generate(&env);
    let buyer = Address::generate(&env);
    let investor = Address::generate(&env);

    env.mock_all_auths();

    let id = client.create_invoice(
        &creator,
        &buyer,
        &1000i128,
        &String::from_str(&env, "USDC"),
        &10u32,
        &(env.ledger().timestamp() + 1000),
        &String::from_str(&env, "ipfs://Qm123"),
    );

    let _ = client.purchase_shares(&investor, &id, &10u32);
    let result = client.try_purchase_shares(&investor, &id, &1u32);
    assert!(result.is_err());
}

#[test]
fn test_error_creator_cannot_buy_own_shares() {
    let (env, contract_id) = setup();
    let client = FactBridgeClient::new(&env, &contract_id);
    let creator = Address::generate(&env);
    let buyer = Address::generate(&env);

    env.mock_all_auths();

    let id = client.create_invoice(
        &creator,
        &buyer,
        &1000i128,
        &String::from_str(&env, "USDC"),
        &100u32,
        &(env.ledger().timestamp() + 1000),
        &String::from_str(&env, "ipfs://Qm123"),
    );

    let result = client.try_purchase_shares(&creator, &id, &10u32);
    assert!(result.is_err());
}

#[test]
fn test_error_settle_wrong_buyer() {
    let (env, contract_id) = setup();
    let client = FactBridgeClient::new(&env, &contract_id);
    let creator = Address::generate(&env);
    let buyer = Address::generate(&env);
    let other = Address::generate(&env);

    env.mock_all_auths();

    let maturity = env.ledger().timestamp() + 100;
    let id = client.create_invoice(
        &creator,
        &buyer,
        &1000i128,
        &String::from_str(&env, "USDC"),
        &100u32,
        &maturity,
        &String::from_str(&env, "ipfs://Qm123"),
    );

    env.ledger().with_mut(|li| {
        li.timestamp = maturity + 1;
    });

    let result = client.try_settle_invoice(&other, &id);
    assert!(result.is_err());
}

#[test]
fn test_error_not_found() {
    let (env, contract_id) = setup();
    let client = FactBridgeClient::new(&env, &contract_id);
    let result = client.try_get_invoice(&999u64);
    assert!(result.is_err());
}