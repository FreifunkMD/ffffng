'use strict';

angular.module('ffffng').factory('config', function (fs, deepExtend) {
    var defaultConfig = {
        server: {
            port: 8080,
            peersPath: '/tmp/peers'
        },
        client: {
            community: {
                name: 'Freifunk Magdeburg',
                domain: 'md.freifunk.net',
                contactEmail: 'kontakt@md.freifunk.net'
            },
            map: {
                graphUrl: 'http://map.md.freifunk.net/graph.html',
                mapUrl: 'http://map.md.freifunk.net/geomap.html'
            },
            coordsSelector: {
                lat: 52.1195724,
                lng: 11.6291814,
                defaultZoom: 11
            }
        }
    };

    var configJSONFile = __dirname + "/../config.json";
    var configJSON = undefined;

    if (fs.existsSync(configJSONFile)) {
        configJSON = JSON.parse(fs.readFileSync(configJSONFile, 'utf8'));
    }

    return deepExtend({}, defaultConfig, configJSON);
});
