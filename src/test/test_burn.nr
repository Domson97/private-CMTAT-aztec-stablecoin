use crate::test::utils;
use dep::aztec::test::helpers::authwit::add_private_authwit_from_call_interface as authwit_cheatcodes;
use crate::FiatCMTAToken as Token;
use crate::types::access_controlModule::{DEFAULT_ADMIN_ROLE, BURNER_ROLE, MINTER_ROLE};

#[test]
unconstrained fn burn_private_on_behalf_of_self() {
    let (env, token_contract_address, issuer, _, mint_amount) = utils::setup_and_mint(/* with_account_contracts */ false);
    let burn_amount = mint_amount / 10;

    Token::at(token_contract_address).grant_role(BURNER_ROLE, issuer).call(&mut env.public());

    // Burn less than balance 
    Token::at(token_contract_address).burn(issuer, burn_amount, 0).call(&mut env.private());
    utils::check_private_balance(token_contract_address, issuer, mint_amount - burn_amount);
}

#[test]
unconstrained fn burn_private_on_behalf_of_other() {
    let (env, token_contract_address, issuer, user1, mint_amount) = utils::setup_and_mint(/* with_account_contracts */ true);

    let mint_amount = 1000;
    let burn_amount = mint_amount / 10;

    Token::at(token_contract_address).mint(user1, mint_amount).call(&mut env.private());

    Token::at(token_contract_address).grant_role(BURNER_ROLE, issuer).call(&mut env.public());

    // Burn on behalf of other
    let burn_call_interface = Token::at(token_contract_address).burn(user1, burn_amount, 1);
    authwit_cheatcodes(user1, issuer, burn_call_interface);
    // Impersonate issuer to perform the call
    // Burn tokens
    env.impersonate(issuer);

    burn_call_interface.call(&mut env.private());
    utils::check_private_balance(token_contract_address, user1, mint_amount - burn_amount);
}

#[test(should_fail_with="Balance too low")]
unconstrained fn burn_private_failure_more_than_balance() {
    let (env, token_contract_address, issuer, _, mint_amount) = utils::setup_and_mint(/* with_account_contracts */ false);

    Token::at(token_contract_address).grant_role(BURNER_ROLE, issuer).call(&mut env.public());
    // Burn more than balance 
    let burn_amount = mint_amount * 10;
    Token::at(token_contract_address).burn(issuer, burn_amount, 0).call(&mut env.private());
    // Private doesnt revert, so we cannot check balances here since notes have already been nullified. Test is done.
}

#[test(should_fail_with="invalid nonce")]
unconstrained fn burn_private_failure_on_behalf_of_self_non_zero_nonce() {
    let (env, token_contract_address, issuer, _, mint_amount) = utils::setup_and_mint(/* with_account_contracts */ false);

    Token::at(token_contract_address).grant_role(BURNER_ROLE, issuer).call(&mut env.public());

    let burn_amount = mint_amount / 10;
    Token::at(token_contract_address).burn(issuer, burn_amount, 1).call(&mut env.private());
}

#[test(should_fail)]
unconstrained fn burn_private_failure_on_behalf_of_other_more_than_balance() {
    let (env, token_contract_address, issuer, user1, mint_amount) = utils::setup_and_mint(/* with_account_contracts */ true);

    Token::at(token_contract_address).grant_role(BURNER_ROLE, issuer).call(&mut env.public());

    // Burn more than balance 
    let burn_amount = mint_amount * 10;
    // Burn on behalf of other
    let burn_call_interface = Token::at(token_contract_address).burn(issuer, burn_amount, 1);
    authwit_cheatcodes(issuer, user1, burn_call_interface);
    // Impersonate user1 to perform the call
    env.impersonate(user1);
    burn_call_interface.call(&mut env.private());
}

#[test(should_fail)]
unconstrained fn burn_private_failure_on_behalf_of_other_without_approval() {
    let (env, token_contract_address, issuer, user1, mint_amount) = utils::setup_and_mint(/* with_account_contracts */ true);

    Token::at(token_contract_address).grant_role(BURNER_ROLE, issuer).call(&mut env.public());

    let burn_amount = mint_amount / 10;
    let burn_call_interface = Token::at(token_contract_address).burn(issuer, burn_amount, 1);
    // Impersonate user1 to perform the call
    env.impersonate(user1);
    burn_call_interface.call(&mut env.private());
}

#[test(should_fail)]
unconstrained fn burn_private_failure_on_behalf_of_other_wrong_designated_caller() {
    let (env, token_contract_address, issuer, user1, mint_amount) = utils::setup_and_mint(/* with_account_contracts */ true);

    Token::at(token_contract_address).grant_role(BURNER_ROLE, issuer).call(&mut env.public());

    let burn_amount = mint_amount / 10;
    // Burn on behalf of other
    let burn_call_interface = Token::at(token_contract_address).burn(issuer, burn_amount, 1);
    authwit_cheatcodes(issuer, issuer, burn_call_interface);
    // Impersonate user1 to perform the call
    env.impersonate(user1);
    burn_call_interface.call(&mut env.private());
}

//TODO: test does not pass
#[test]
unconstrained fn burn_private_batch_success() {
    // Setup without account contracts. We are not using authwits here, so dummy accounts are enough
    let (env, token_contract_address, issuer, user1, mint_amount) = utils::setup_and_mint(/* with_account_contracts */ false);
    
    Token::at(token_contract_address).grant_role(MINTER_ROLE, issuer).call(&mut env.public());

    let extra_mint_amount = 10000;
    let addresses = [user1];

    Token::at(token_contract_address).mint(user1, extra_mint_amount).call(&mut env.private());

    utils::check_private_balance(token_contract_address, user1, extra_mint_amount);

    let total_supply = Token::at(token_contract_address).total_supply().view(&mut env.public());

    Token::at(token_contract_address).grant_role(BURNER_ROLE, issuer).call(&mut env.public());

    let burn_amount = [extra_mint_amount / 2];

    // Burn on behalf of other
    let burn_call_interface = Token::at(token_contract_address).burn_batch(addresses, burn_amount, 1);
    authwit_cheatcodes(addresses[0], issuer, burn_call_interface);
    // Impersonate issuer to perform the call
    // Burn tokens
    env.impersonate(issuer);
    burn_call_interface.call(&mut env.private());

    utils::check_private_balance(token_contract_address, addresses[0], extra_mint_amount - burn_amount[0]);
    let total_supply_after_burn = Token::at(token_contract_address).total_supply().view(&mut env.public());
    assert(total_supply_after_burn == total_supply - burn_amount[0]);
}