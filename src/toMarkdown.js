import TurndownService from 'turndown';

const NEWLINE = '\r\n';

const converter = new TurndownService({
	headingStyle: 'atx',
	bulletListMarker: '-',
	codeBlockStyle: 'fenced',
	emDelimiter: '*',
	strongDelimiter: '__',
	linkStyle: 'referenced',
	blankReplacement: function(content) {
		return '';
	},
})
	.addRule('divs', {
		filter: 'div',
		replacement: function(content, node, options) {
			return content + (node.nextElementSibling ? NEWLINE : '');
		},
	})
	.addRule('headings', {
		filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
		replacement: function(content, node, options) {
			const headerLevel = Number(node.nodeName.substr(1));
			let hashes = '';
			for (let i = 1; i <= headerLevel; i++) {
				hashes += '#';
			}

			return `${hashes} ${content}${NEWLINE}  ${NEWLINE}`;
		},
	})
	.addRule('code', {
		filter: ['pre'],
		replacement: function(content) {
			return `\`\`\`${NEWLINE}${content}${NEWLINE}\`\`\``;
		},
	});

function toMarkdown(htmlString = '', includeMeta = false) {
	let markdown = trimWhiteSpace(converter.turndown(htmlString));

	return markdown;
}

function trimWhiteSpace(markdownString = '') {
	const completelyBlankLine = /^[\r\n]/gm;
	const justWhiteSpace = /^\s*[\r\n]/gm;

	return markdownString;
	// .replace(completelyBlankLine, '');
	// .replace(justWhiteSpace, NEWLINE);
}

export default toMarkdown;
