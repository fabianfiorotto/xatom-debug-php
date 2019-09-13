var PhpOptions;

PhpOptions = {
  port: {
    type: 'number',
    title: 'Port Number',
    default: 9000
  },
  mapPath: {
    type: 'string',
    title: 'Map Path',
    default: '',
    description: 'Relative project path files location in server.'
  }
};

module.exports = {PhpOptions};
