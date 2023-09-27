const { expect } = require('chai');
const sinon = require('sinon');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const nock = require('nock');

const action = require('../lib/actions/filter');

chai.use(chaiAsPromised);

const self = {
  emit: sinon.spy(),
  logger: {
    info: () => {},
    warn: () => {},
  },
};

xdescribe('Test old filter', () => {
  const msg = {
    data: {
      foo: 20,
      bar: 'foo',
      float: 20.4,
      flString: '20.4',
      iso8601: '1995-12-25',
    },
    metadata: {},
  };

  afterEach(() => { self.emit.resetHistory(); });

  xdescribe(' should pass ', async () => {
    xit('true', async () => {
      await action.process.call(self, msg, { condition: 'true' });
      expect(self.emit.getCall(0).args[0]).to.equal('data');
    });
    xit('!false', async () => {
      await action.process.call(self, msg, { condition: '!false' });
      expect(self.emit.getCall(0).args[0]).to.equal('data');
    });
    xit('foo > 5', async () => {
      await action.process.call(self, msg, { condition: 'data.foo > 5' });
      expect(self.emit.getCall(0).args[0]).to.equal('data');
    });
    xit('parseFloat(flString) > 2', async () => {
      await action.process.call(self, msg, { condition: 'parseFloat(data.flString) > 2' });
      expect(self.emit.getCall(0).args[0]).to.equal('data');
    });
    xit('flString > 20', async () => {
      await action.process.call(self, msg, { condition: 'data.flString > 20' });
      expect(self.emit.getCall(0).args[0]).to.equal('data');
    });
    xit('moment(iso8601).day() == 1', async () => {
      await action.process.call(self, msg, { condition: 'moment(data.iso8601).day() == 1' });
      expect(self.emit.getCall(0).args[0]).to.equal('data');
    });
  });

  xdescribe(' should fail ', async () => {
    xit('false', async () => {
      await action.process.call(self, msg, { condition: 'false' });
      expect(self.emit.getCall(0).args[0]).to.equal('end');
    });
    xit('!true', async () => {
      await action.process.call(self, msg, { condition: '!true' });
      expect(self.emit.getCall(0).args[0]).to.equal('end');
    });
    xit('foo > 20', async () => {
      await action.process.call(self, msg, { condition: 'data.foo > 20' });
      expect(self.emit.getCall(0).args[0]).to.equal('end');
    });
    xit('parseFloat(flString) > 2', async () => {
      await action.process.call(self, msg, { condition: 'parseFloat(data.flString) > 20.4' });
      expect(self.emit.getCall(0).args[0]).to.equal('end');
    });
    xit('flString > 20', async () => {
      await action.process.call(self, msg, { condition: 'data.flString > 20.4' });
      expect(self.emit.getCall(0).args[0]).to.equal('end');
    });
  });

  xdescribe(' init ', async () => {
    xit(' no reject flow ', async () => {
      const result = await action.init.call(self, {});
      expect(result).to.equal(undefined);
    });

    xit(' reject flow ', async () => {
      const cfg = { reject: 'flowId' };
      const api = 'https://www.elastic.io';
      process.env.ELASTICIO_API_URI = api;
      process.env.ELASTICIO_API_USERNAME = 'user';
      process.env.ELASTICIO_API_KEY = 'pass';

      const response = {
        data: {
          attributes: {
            type: 'type',
            graph: {
              nodes: [{ id: 'stepId', command: 'elasticio/webhook:receive' }],
            },
          },
          relationships: {
            user: {
              data: {
                id: 'userId',
              },
            },
          },
        },
      };

      nock(api, { encodedQueryParams: true })
        .get(`/v2/flows/${cfg.reject}`)
        .reply(200, response);

      const result = await action.init.call(self, cfg);
      expect(result).to.equal('userId.flowId/type.stepId.requeue');
    });
  });
});
