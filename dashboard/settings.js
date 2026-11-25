const path = require('path');

module.exports = {
    uiPort: process.env.PORT || 1880,
    mqttReconnectTime: 15000,
    serialReconnectTime: 15000,
    debugMaxLength: 1000,
    flowFile: path.join(__dirname, 'nodered-flow.json'),
    flowFilePretty: true,
    userDir: __dirname,
    httpAdminRoot: '/admin',
    httpStatic: path.join(__dirname, 'public'),
    adminAuth: null,
    logging: {
        console: {
            level: "info",
            metrics: false,
            audit: false
        }
    },
    exportGlobalContextKeys: false,
    editorTheme: {
        projects: {
            enabled: false
        }
    }
};
