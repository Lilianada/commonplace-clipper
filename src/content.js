import rangy from 'rangy';
import toMarkdown from './toMarkdown';

// Use a self-executing function to avoid polluting the global namespace
(function() {
	// Set a guard to avoid running multiple times
	if (window.webClipperHasRun) {
		return;
	}
	window.webClipperHasRun = true;

	// Initialize rangy on page load
	rangy.init();

	// For development, get the current selection when the script loads
	try {
		const selection = rangy.getSelection();
		if (selection && selection.rangeCount > 0) {
			const html = selection.toHtml();
			const md = toMarkdown(html);
			console.debug('Web Clipper - Current selection:', { html, markdown: md });
		}
	} catch (e) {
		console.error('Web Clipper - Error processing selection:', e);
	}

	// Listen for messages from the popup
	window.addEventListener('message', async (event) => {
		if (event.source !== window || !event.data) return;
		
		// Handle selection clip request
		if (event.data.type === 'GET_SELECTION_CLIP') {
			try {
				let html = '';
				let md = '';
				const selection = rangy.getSelection();
				if (selection && selection.rangeCount > 0) {
					html = selection.toHtml();
					md = toMarkdown(html);
				}
				// Return the results
				window.postMessage({
					type: 'SELECTION_CLIP_RESULT',
					html,
					markdown: md
				}, '*');
			} catch (e) {
				console.error('Web Clipper - Error processing selection:', e);
				window.postMessage({
					type: 'SELECTION_CLIP_RESULT',
					html: '',
					markdown: '',
					error: e.message
				}, '*');
			}
		}
	});
})();
