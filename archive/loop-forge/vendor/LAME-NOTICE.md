Loop Forge uses the unmodified lamejs 1.2.1 MP3 encoder by Alex Zhukov,
a JavaScript port of LAME, under LGPL-3.0.

LAME: https://lame.sourceforge.net/
Source and replaceable standalone build: https://github.com/zhuker/lamejs
Exact distribution: https://www.npmjs.com/package/lamejs/v/1.2.1

The encoder is loaded separately by js/mp3-worker.js. Replace vendor/lame.min.js
with a compatible build to use a modified version; no app rebuild is needed.
See LAME-LICENSE.txt, LGPL-3.0.txt and GPL-3.0.txt for license terms.
