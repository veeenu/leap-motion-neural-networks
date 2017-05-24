requirejs.config({
  'baseUrl': 'js',
  'paths': {
    'leap':         '../vendor/leapjs/leap-0.6.1',
    'leap-plugins': '../vendor/leapjs-plugins/main/leap-plugins-0.1.6',
    'leap-hand':    './lib/leap-rigged-hand',
    'brain':        './lib/brain',
    'watch':        '../vendor/watch/src/watch',
    'three':        '../vendor/threejs/build/three',
    'mustache':     '../vendor/mustache/mustache'
  },
  'shim': {
    'three': {
      'exports': 'THREE'
    },
    'leap': {
      'exports': 'Leap'
    },
    'leap-plugins': {
      'deps': ['leap'],
      'exports': 'Leap'
    },
    'leap-hand': {
      'deps': ['leap', 'leap-plugins', 'three'],
      'exports': 'Leap'
    },
    'brain': {
      'exports': 'brain'
    }
  },
  'deps': ['main']
});
