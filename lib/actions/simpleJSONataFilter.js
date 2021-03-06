// eslint-disable-next-line import/no-unresolved
const { transform } = require('@openintegrationhub/ferryman');
const { wrapper } = require('@blendededge/ferryman-extensions');

function clearResponse(result, addMetadataToResponse) {
  const resultCopy = JSON.parse(JSON.stringify(result.data));
  if (addMetadataToResponse) {
    resultCopy.openIntegrationHubMeta = result.passthrough;
  }
  return resultCopy;
}

/**
 * This function will be called from the elasticio platform with the following data
 * @param msg incoming message object that contains "data" with payload
 * @param cfg object to retrieve actions configuration values
 */

exports.process = async function simpleJSONataFilter(msg, cfg) {
  const wrapped = wrapper(this, msg, cfg);

  const result = transform(msg, { customMapping: cfg.expression });
  if (result) {
    const clearBody = clearResponse(msg, cfg.addMetadataToResponse);
    const message = {
      attachments: {},
      data: clearBody,
      metadata: {},
    };
    await wrapped.emit('data', message);
  } else {
    wrapped.logger.info('The message was received but did not meet the condition.');
    if (cfg.assertion) {
      throw new Error(`Condition not met on JSONata expression: ${cfg.expression}`);
    }
  }
};
