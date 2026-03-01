SIMPLE_INTENTS = [
    'activate_my_card',
    'age_limit',
    'apple_pay_or_google_pay',
    'atm_support',
    'automatic_top_up',
    'balance_not_updated_after_bank_transfer',
    'balance_not_updated_after_cheque_or_cash_deposit',
    'cancel_transfer',
    'card_about_to_expire',
    'card_acceptance',
    'card_arrival',
    'card_delivery_estimate',
    'card_linking',
    'change_pin',
    'contactless_not_working',
    'country_support',
    'declined_card_payment',
    'declined_cash_withdrawal',
    'disposable_card_limits',
    'edit_personal_details',
    'exchange_charge',
    'exchange_rate',
    'exchange_via_app',
    'extra_charge_on_statement',
    'fiat_currency_support',
    'get_disposable_virtual_card',
    'get_physical_card',
    'getting_spare_card',
    'getting_virtual_card',
    'order_physical_card',
    'passcode_forgotten',
    'pending_card_payment',
    'pending_cash_withdrawal',
    'pending_top_up',
    'pending_transfer',
    'pin_blocked',
    'receiving_money',
    'supported_cards_and_currencies',
    'top_up_by_bank_transfer_charge',
    'top_up_by_card_charge',
    'top_up_by_cash_or_cheque',
    'top_up_failed',
    'top_up_limits',
    'top_up_reverted',
    'topping_up_by_card',
    'transfer_fee_charged',
    'transfer_into_account',
    'transfer_timing',
    'verify_my_identity',
    'verify_top_up',
    'virtual_card_not_working',
    'visa_or_mastercard',
    'why_verify_identity'
]

COMPLEX_INTENTS = [
    'beneficiary_not_allowed',
    'card_not_working',
    'card_payment_fee_charged',
    'card_payment_not_recognised',
    'card_payment_wrong_exchange_rate',
    'card_swallowed',
    'cash_withdrawal_charge',
    'cash_withdrawal_not_recognised',
    'compromised_card',
    'declined_transfer',
    'direct_debit_payment_not_recognised',
    'failed_transfer',
    'lost_or_stolen_card',
    'lost_or_stolen_phone',
    'Refund_not_showing_up',
    'request_refund',
    'reverted_card_payment?',
    'terminate_account',
    'transfer_not_received_by_recipient',
    'unable_to_verify_identity',
    'verify_source_of_funds',
    'wrong_amount_of_cash_received',
    'wrong_exchange_rate_for_cash_withdrawal'
]


def classify_query_complexity(detected_intents):
    """
    detected_intents = list of intent names, e.g. ["lost_or_stolen_card", "card_about_to_expire"]
    """

    # Multiple intents are always treated as complex, even if each is simple.
    if len(detected_intents) >= 2:
        return "complex"

    if len(detected_intents) == 1:
        intent = detected_intents[0]
        if intent in SIMPLE_INTENTS:
            return "simple"
        return "complex"

    # No intent detected → complex
    return "complex"
