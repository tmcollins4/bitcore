import { expect } from 'chai';
import sinon from 'sinon';
import { ClientError } from '../src/lib/errors/clienterror';
import { WalletService } from '../src/lib/server';

describe('Scan startingStep validation', function() {
  const sandbox = sinon.createSandbox();
  afterEach(() => sandbox.restore());

  for (const method of ['scan', 'startScan'] as const) {
    it(`${method} accepts supported steps and default inputs before propagating wallet errors`, function() {
      const server = Object.create(WalletService.prototype) as WalletService;
      const unavailable = new Error('Wallet unavailable');
      const getWallet = sandbox.stub(server, 'getWallet').callsArgWith(1, unavailable);
      for (const startingStep of [undefined, null, 0, false, '', 1, 10, 1000]) {
        getWallet.resetHistory();
        const callback = sinon.spy();
        server[method]({ startingStep }, callback);
        const context = `startingStep=${JSON.stringify(startingStep)}`;
        expect(getWallet.calledOnce, context).to.equal(true);
        expect(callback.calledOnceWithExactly(unavailable), context).to.equal(true);
      }
    });

    for (const [description, startingStep] of [
      ['above the existing default', 1001],
      ['large enough to exhaust memory', 10000000],
      ['infinite', Infinity],
      ['negative', -1],
      ['fractional', 1.5],
      ['a numeric string', '1'],
      ['an array', [1]],
      ['an object', { step: 1 }],
      ['a boolean', true]
    ] as Array<[string, unknown]>) {
      it(`${method} rejects a startingStep that is ${description} before accessing the wallet`, function(done) {
        const server = Object.create(WalletService.prototype) as WalletService;
        // Stop the unfixed implementation safely before it can derive addresses.
        const getWallet = sandbox.stub(server, 'getWallet').callsArgWith(1, new Error('Unexpected wallet access'));
        server[method]({ startingStep }, err => {
          expect(err).to.be.instanceOf(ClientError);
          expect(err.code).to.equal('BADREQUEST');
          expect(getWallet.called).to.equal(false);
          done();
        });
      });
    }
  }
});
