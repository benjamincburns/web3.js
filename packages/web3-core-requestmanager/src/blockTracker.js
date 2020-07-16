"use strict";

const EventEmitter = require("events").EventEmitter; 
const Subscriptions = require('web3-core-subscriptions').subscriptions;

class BlockTracker extends EventEmitter {
    constructor(requestManager) {
        super();
        this._requestManager = requestManager;
        this._latestBlock = null;

    }

    _initializeSubscription() {
        const subscribe = new Subscriptions({
            name: 'subscribe',
            type: 'eth',
            subscriptions: {
                'newBlockHeaders': {
                    subscriptionName: 'newHeads', // replace subscription with this name
                    params: 0,
                    outputFormatter: formatters.outputBlockFormatter
                }
            }
        });

        this._subscription = subscribe();
        const _this = this;
        // should use ordered block queue, not this
        this._subscription.on("data", (block) => _this.emit("block", block));

        // need to emit an event for reorg with new blocks
    }
}

exports = module.exports = BlockTracker;