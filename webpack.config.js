const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
	entry: {
		popup: './src/popup.js',
		content_scripts: './src/content.js',
		background: './src/background.js'
	},
	output: {
		path: path.resolve(__dirname, 'addon'),
		filename: '[name]/index.js',
	},
	plugins: [
		new CopyWebpackPlugin({
			patterns: [
				{ from: 'oauth-callback.html', to: './' }
			]
		})
	]
};
