"use strict";

const TrasactionLifecycle = require("./transactionLifecycle");

class TransactionManager {
    constructor(requestManager) {
      this._requestManager = requestManager;
    }

    /**
     * Called to kick off the process of sending a transaction
     * 
     * @param {Object} transaction the transaction to send
     * @param {Method} method the Method instance that was called to send this transaction
     * @return {Promise<TransactionLifecycle>}
     */
    async send(transaction, method) {
        const signedTransaction = await this._signIfNecessary(transaction, method);

        let lifecycle = null;
        let params = null;

        if (_isSignedTransaction(signedTransaction)) {
            lifecycle = new TransactionLifecycle(signedTransaction, method.transactionConfirmationBlocks);
            params = [signedTransaction.rawTransaction];
        } else {
            lifecycle = new TransactionLifecycle(transaction);
            params = [{
                data: transaction.data,
                from: transaction.from,
                gas: transaction.gas,
                gasPrice: transaction.gasPrice,
                to: transaction.to,
            }];
        }
        try {
            const transactionHash = await this._submitTransaction(params, lifecycle);
            lifecycle.setSubmitted(transactionHash);
        } catch (err) {
            lifecycle.setFailedToSubmit(err);
        }
    }

    _submitTransaction(params) {
        const method = typeof params[0] === "string" ? "eth_sendRawTransaction" : "eth_sendTransaction";
        const _this = this;

        return new Promise((resolve, reject) => {
            _this._requestManager.send({method, params}, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            })
        });
    }

    _initializeLifecycle(lifecycle) {
        lifecycle.on("submitted", this._handleSubmitted.bind(this, lifecycle));
        lifecycle.on("failedToSubmit", this._handleFailedSubmission.bind(this, lifecycle));
        lifecycle.on("mined", this._handleMined.bind(this, lifecycle));
        lifecycle.on("confirmed", this._handleConfirmed.bind(this, lifecycle));
        lifecycle.on("confirmedWithError", this._handleConfirmedWithError.bind(this, lifecycle));
        lifecycle.on("reorgedOut", this._handleReorgedOut.bind(this, lifecycle));
    }

    _handleSubmitted(lifecycle, transactionHash) {
    }

    _handleFailedSubmission(lifecycle, err) {
    }

    _handleMined(lifecycle, receipt) {
        if (!lifecycle.transactionConfirmationBlocks) {
            lifecycle.setConfirmed();
        }
    }

    _handleConfirmed(lifecycle) {
    }

    _handleConfirmedWithError(lifecycle, err) {
    }

    _handleReorgedOut() {
    }

    async _signIfNecessary(transaction, method) {
        if (!method || !method.accounts || !method.accounts.wallet || !method.accounts.wallet.length) {
            return transaction;
        }

        if (!_isSignedTransaction(tx)) {
            const wallet = _getWallet((_.isObject(tx)) ? tx.from : null, method.accounts);

            // if no wallet or no privkey found, rely on the client's account
            // management to sign
            if (!wallet || !wallet.privateKey) {
                return transaction;
            }

            // If wallet was found, sign tx, and send using sendRawTransaction
            const txOptions = {... transaction };

            // don't include the from param when signing. it's inferred by the
            // privKey & signature
            delete txOptions.from;

            if (method.defaultChain && !txOptions.chain) {
                txOptions.chain = method.defaultChain;
            }

            if (method.defaultHardfork && !txOptions.hardfork) {
                txOptions.hardfork = method.defaultHardfork;
            }

            if (method.defaultCommon && !txOptions.common) {
                txOptions.common = method.defaultCommon;
            }

            return method.accounts.signTransaction(txOptions, wallet.privateKey);
        }
    }
}

function _getWallet(from, accounts) {
    const wallet = null;

    // is index given
    if (accounts.wallet[from]) {
        wallet = accounts.wallet[from];

        // is account given
    } else if (from.address && from.privateKey) {
        wallet = from;

        // search in wallet for address
    } else {
        wallet = accounts.wallet[from.toLowerCase()];
    }

    return wallet;
};

function _isSignedTransaction(tx) {
    if(tx.v && tx.r && tx.s) {
        return true;
    }

    return !!tx.rawTransaction;
}

exports = module.exports = TransactionManager;