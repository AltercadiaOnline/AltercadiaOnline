// @ts-nocheck
import { gatewayIntentFromClient, } from '../../shared/intent/intentProtocol.js';
export { buildGatewayIntentAction, buildGatewayIntentActionFromExecute, gatewayIntentFromClient, } from '../../shared/intent/intentProtocol.js';
export function toTransactionIntentAction(playerId, characterId, intent) {
    return gatewayIntentFromClient({ playerId, characterId }, intent);
}
export class TransactionValidationError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.name = 'TransactionValidationError';
        this.code = code;
    }
}
export { buildIntentFailure, buildIntentSuccess } from '../../shared/intent/intentProtocol.js';
export function isTransactionValidationFailure(result) {
    return !result.ok;
}
export function isTransactionExecuteFailure(result) {
    return !result.ok;
}
