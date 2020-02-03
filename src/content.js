import rangy from 'rangy';
import toMarkdown from './toMarkdown';

(function() {
	/**
	 * Check and set a global guard variable.
	 * If this content script is injected into the same page again,
	 * it will do nothing next time.
	 */
	// if (window.hasRun) {
	// 	return;
	// }
	// window.hasRun = true;

	try {
		let selection = rangy.getSelection().toHtml();
		let md;
		if (selection) {
			md = toMarkdown(selection);
		}
		console.log(selection);
		console.log(md);
	} catch (e) {
		console.log(e);
	}

	/**
	 * Given a URL to a beast image, remove all existing beasts, then
	 * create and style an IMG node pointing to
	 * that image, then insert the node into the document.
	 */
	// function insertBeast(beastURL) {
	// 	removeExistingBeasts();
	// 	let beastImage = document.createElement('img');
	// 	beastImage.setAttribute('src', beastURL);
	// 	beastImage.style.height = '100vh';
	// 	beastImage.className = 'beastify-image';
	// 	document.body.appendChild(beastImage);
	// }

	/**
	 * Remove every beast from the page.
	 */
	// function removeExistingBeasts() {
	// 	let existingBeasts = document.querySelectorAll('.beastify-image');
	// 	for (let beast of existingBeasts) {
	// 		beast.remove();
	// 	}
	// }

	/**
	 * Listen for messages from the background script.
	 * Call "beastify()" or "reset()".
	 */
	// browser.runtime.onMessage.addListener(message => {
	// 	if (message.command === 'beastify') {
	// 		insertBeast(message.beastURL);
	// 	} else if (message.command === 'reset') {
	// 		removeExistingBeasts();
	// 	}
	// });
})();
