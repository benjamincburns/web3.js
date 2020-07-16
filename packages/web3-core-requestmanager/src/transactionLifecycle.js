/*
    This file is part of web3.js.
    web3.js is free software: you can redistribute it and/or modify
    it under the terms of the GNU Lesser General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
    web3.js is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Lesser General Public License for more details.
    You should have received a copy of the GNU Lesser General Public License
    along with web3.js.  If not, see <http://www.gnu.org/licenses/>.
*/
/**
 * @file transactionLifecycle.js
 * @author Ben Burns <benjamin.c.burns@gmail.com>
 * @date 2020
 */
"use strict";

const EventEmitter = require("events").EventEmitter;
/**
 * Models the lifecycle of a given transaction and tracks where we are in that
 * lifecycle.
 */
class TransactionLifecycle extends EventEmitter {

    /**
     * Constructs a new TransactionLifecycle object
     * 
     * @param {Object} transaction a reference to the transaction that this object is tracking
     * @constructor
     */
    constructor(transaction, confirmationsRequired) {
        super();
        this._transaction = transaction;
        this._stage = "unsubmitted";
        this._receipt = null;
        this._confirmationsRequired = confirmationsRequired;
    }

    /**
     * The transaction that this lifecycle object is tracking
     * @returns {Object}
     */
    get transaction() {
        return this._transaction;
    }

    /**
     * The stage of the tracked transaction's lifecycle
     * 
     * @returns {string}
     */
    get stage() {
        return this._stage;
    }

    /**
     * The receipt for the tracked transaction, if one has been produced. Otherwise null.
     * 
     * @returns {Object}
     */
    get receipt() {
        return this._receipt;
    }

    /**
     * The number of confirmations required for this transaction lifecycle to complete
     * 
     * @returns {number}
     */
    get confirmationsRequired() {
        return this._confirmationsRequired;
    }

    /**
     * Called by the TransactionManager to indicate that the transaction has been submitted.
     * 
     * @returns {void}
     */
    setSubmitted() {
        this._checkPrecondition("unsubmitted", "submitted");
        this._state = "submitted";
        this.emit("submitted");
    }

    /**
     * Called by the TransactionManager to indicate that it failed to submit the transaction.
     * 
     * @param {object} err an error object describing what went wrong, if one is available.
     * @returns {void}
     */
    setFailedToSubmit(err) {
        this._checkPrecondition("unsubmitted", "failedToSubmit");
        this._state = "failedToSubmit";
        this.emit("failedToSubmit", err);
        this.emit("done");
    }

    /**
     * Called by the TransactionManager to indicate that the transaction has been
     * successfully mined. Does not indicate that the transaction has been
     * confirmed, however.
     * 
     * @param {Object} receipt The transaction receipt
     * @returns {void}
     */
    setMined(receipt) {
        this._checkPrecondition("submitted", "mined");
        this._state = "mined";
        this._receipt = receipt;
        this.emit("mined", receipt);
    }

    /**
     * Called by the TransactionManager to indicate that the transaction has
     * been successfully confirmed.
     * 
     * @returns {void}
     */
    setConfirmed() {
        this._checkPrecondition("mined", "confirmed")
        this._state = "confirmed";
        this.emit("confirmed", this._receipt);
        this.emit("done");
    }

    /**
     * Called by the TransactionManager to indicate that the transaction has
     * completed and been confirmed, but the transaction failed.
     * 
     * @param {object} err an error object describing what went wrong, if one is available.
     * @returns {void}
     */
    setConfirmedWithError(err) {
        this._checkPrecondition("mined", "confirmedWithError");
        this._state = "confirmedWithError";
        this.emit("confirmedWithError", err);
        this.emit("done");
    }

    /**
     * Called by the TransactionManager to indicate that a transaction that had
     * previously been mined has now been reorged out of the chain and must be
     * resubmitted.
     * 
     * @returns {void}
     */
    setReorgedOut() {
        this._checkPrecondition("mined", "reorgedOut");
        this._state = "reorgedOut";
        this.emit("reorgedOut");
        this.emit("done");
    }

    /**
     * An internal helper function that's used to check that a desired state
     * transition is valid.
     * 
     * @param {string|Array} allowedStates 
     * @param {string} desiredState 
     * @returns {void}
     */
    _checkPrecondition(allowedStates, desiredState) {
        if (Array.isArray(allowedStates) && !states.includes(this._state)) {
            throw new Error(
                `Invalid transaction lifecycle state transition! Current state: "${this._state}," desired state: ` +
                `"${desiredState}," states allowed: ${"\"" + allowedStates.join("\",\"") + "\""}`
            );
        } else if (allowedStates !== desiredState) {
            throw new Error(
                `Invalid transaction lifecycle state transition! Current state: "${this._state}," desired state: ` +
                `"${desiredState}," allowed state: ${allowedStates}`
            );
        }
    }
}

exports = module.exports = TransactionLifecycle;
