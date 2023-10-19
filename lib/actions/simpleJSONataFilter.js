const jsonata = require('jsonata');
const { wrapper } = require('@blendededge/ferryman-extensions');

function clearResponse(result, addMetadataToResponse) {
  const resultCopy = JSON.parse(JSON.stringify(result.data));
  if (addMetadataToResponse) {
    resultCopy.openIntegrationHubMeta = result.passthrough;
  }
  return resultCopy;
}

/**
 * This function will be called from the open integration hub platform with the following data
 * @param msg incoming message object that contains "data" with payload
 * @param cfg object to retrieve actions configuration values
 * @param snapshot object to retrieve the snapshot values
 * @param msgHeaders incoming message headers
 * @param tokenData object to retrieve flow and step metadata values
 */

exports.process = async function simpleJSONataFilter(msg, cfg, snapshots, msgHeaders, tokenData) {
  const wrapped = await wrapper(this, msg, cfg, snapshots, msgHeaders, tokenData);

  if (!cfg.expression) {
    throw new Error('Expression is required');
  }

  wrapped.logger.debug(`Expression: ${cfg.expression}`);
  const evaluator = jsonata(cfg.expression);
  return evaluator.evaluate(msg).then((result) => {
    if (result) {
      const clearBody = clearResponse(msg, cfg.addMetadataToResponse);
      const message = {
        attachments: {},
        data: clearBody,
        metadata: {},
      };
      wrapped.emit('data', message);
      wrapped.emit('end');
    } else {
      wrapped.logger.info('The message was received but did not meet the condition.');
      if (cfg.assertion) {
        throw new Error(`Condition not met on JSONata expression: ${cfg.expression}`);
      }
      wrapped.emit('end');
    }
  }).catch((err) => {
    wrapped.logger.error(`Error occurred while evaluating JSONata expression: ${cfg.expression}`);
    wrapped.logger.error(err);
    wrapped.emit('error', err);
  });
};
