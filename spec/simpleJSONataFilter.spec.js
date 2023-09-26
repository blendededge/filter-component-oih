const { expect } = require('chai');
const sinon = require('sinon');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

const action = require('../lib/actions/simpleJSONataFilter');

chai.use(chaiAsPromised);

const self = {
  emit: sinon.spy(),
  logger: {
    info: () => {},
    error: sinon.spy(),
  },
};

describe('Test filter', () => {
  const simpleMsg = {
    data: {
      hello: 'world',
    },
    metadata: {},
  };

  afterEach(() => { self.emit.resetHistory(); });

  async function errorCondition(condition) {
    let Error;
    try {
      await action.process.call(self, simpleMsg, condition);
    } catch (error) {
      Error = error;
    }
    expect(Error.message).to.be.equal('Unable to cast value to a number: "world"');
  }

  async function filter(condition, passOrFail) {
    await action.process.call(self, simpleMsg, condition);
    if (passOrFail) {
      expect(self.emit.getCall(0).args[0]).to.equal('data');
      expect(self.emit.getCall(0).args[1]).to.not.equal(undefined);
    } else {
      expect(self.emit.getCall(0).args[0]).to.equal('end');
    }
  }

  async function passthroughFilter(condition) {
    const passthroughMsg = {
      passthrough: {
        step_2: {
          data: {
            two: 'sample',
          },
        },
        step_1: {
          data: {
            one: 'sample',
          },
        },
      },
      data: {
        step_2: {
          data: {
            two: 'sample',
          },
        },
      },
      metadata: {},
    };
    await action.process.call(self, passthroughMsg, condition);
    expect(self.emit.calledOnce).to.equal(true);
  }

  async function passthroughError(condition) {
    const passthroughErrorMsg = {
      passthrough: {
        step_2: {
          data: {
            two: 'sample',
          },
        },
        step_1: {
          data: {
            one: 'sample',
          },
        },
      },
      data: {
        elasticio: {},
        step_2: {
          data: {
            two: 'sample',
          },
        },
      },
      metadata: {},
    };
    let Error;
    try {
      await action.process.call(self, passthroughErrorMsg, condition);
    } catch (error) {
      Error = error;
    }
    expect(Error.message).to.be.equal('elasticio property is reserved             '
        + 'if you are using passthrough functionality');
  }

  async function assertionTest(condition) {
    const msg = {
      passthrough: {
        step_2: {
          data: {
            two: 'sample2',
          },
        },
        step_1: {
          data: {
            one: 'sample1',
          },
        },
      },
      data: {
        step_2: {
          data: {
            two: 'sample2',
          },
        },
      },
      metadata: {},
    };

    // eslint-disable-next-line no-param-reassign
    condition.assertion = true;
    let Error;
    try {
      await action.process.call(self, msg, condition);
    } catch (error) {
      Error = error;
    }
    expect(Error.message).to.equal(`Condition not met on JSONata expression: ${condition.expression}`);
  }

  const passCondition1 = {
    expression: 'true',
  };
  const passCondition2 = {
    expression: '$not(false)',
  };
  const passCondition3 = {
    expression: '20 > 5',
  };
  const passCondition4 = {
    expression: '20.4 > 2',
  };
  const passCondition5 = {
    expression: '20.4 > 20',
  };

  const failCondition1 = {
    expression: 'false',
  };
  const failCondition2 = {
    expression: '$not(true)',
  };
  const failCondition3 = {
    expression: '20 > 20',
  };
  const failCondition4 = {
    expression: '20.4 > 20.4',
  };
  const failCondition5 = {
    expression: 'null',
  };
  const failCondition6 = {
    expression: 'undefined',
  };

  const errorCondition1 = {
    expression: '$number(hello) > 5',
  };

  const passthroughCondition = {
    expression: 'elasticio.step_1.data.one = elasticio.step_2.data.two',
  };

  describe('Should emit message', async () => {
    it(passCondition1.expression, async () => { await filter(passCondition1, true); });
    it(passCondition2.expression, async () => { await filter(passCondition2, true); });
    it(passCondition3.expression, async () => { await filter(passCondition3, true); });
    it(passCondition4.expression, async () => { await filter(passCondition4, true); });
    it(passCondition5.expression, async () => { await filter(passCondition5, true); });
    it(passthroughCondition.expression, async () => {
      await passthroughFilter(passthroughCondition);
    });
  });

  describe('Should move elasticio variable', async () => {
    const msg = {
      stepId: 'step_2',
      headers: {},
      passthrough: {
        step_2: { stepId: 'step_2', headers: {}, data: { result: 'Hello world!' } },
        step_1: {
          data: { lastPoll: '4750-04-19T10:05:52.098Z', fireTime: '2701-02-20T02:58:30.890Z' },
        },
      },
      data: { result: 'Hello world!' },
      metadata: {},
    };
    const configuration = { expression: '0!=1' };

    it('addMetadataToResponse enabled', async () => {
      configuration.addMetadataToResponse = true;
      await action.process.call(self, JSON.parse(JSON.stringify(msg)), configuration);
      expect(self.emit.getCall(0).args[1].data).to.deep.equal({
        openIntegrationHubMeta: {
          step_1: {
            data: {
              fireTime: '2701-02-20T02:58:30.890Z',
              lastPoll: '4750-04-19T10:05:52.098Z',
            },
          },
          step_2: {
            data: {
              result: 'Hello world!',
            },
            headers: {},
            stepId: 'step_2',
          },
        },
        result: 'Hello world!',
      });
    });

    it('addMetadataToResponse disabled', async () => {
      configuration.addMetadataToResponse = false;
      await action.process.call(self, JSON.parse(JSON.stringify(msg)), configuration);
      expect(self.emit.getCall(0).args[1].data).to.deep.equal({
        result: 'Hello world!',
      });
    });
  });

  describe('Should log message to console', async () => {
    it(passCondition1.expression, async () => { await filter(failCondition1, false); });
    it(failCondition2.expression, async () => { await filter(failCondition2, false); });
    it(failCondition3.expression, async () => { await filter(failCondition3, false); });
    it(failCondition4.expression, async () => { await filter(failCondition4, false); });
    it(failCondition5.expression, async () => { await filter(failCondition5, false); });
    it(failCondition6.expression, async () => { await filter(failCondition6, false); });
  });

  xdescribe('Should throw error', async () => {
    it(errorCondition1.expression, async () => { await errorCondition(errorCondition1); });
    it(passthroughCondition.expression, async () => {
      await passthroughError(passthroughCondition);
    });
    it(passthroughCondition.expression, async () => { await assertionTest(passthroughCondition); });
  });
});
