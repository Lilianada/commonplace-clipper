const path = require('path');

module.exports = {
	entry: {
		popup: './src/popup.js',
	},
	output: {
		path: path.resolve(__dirname, 'addon'),
		filename: '[name]/index.js',
	},
};
