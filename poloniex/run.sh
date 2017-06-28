cp priv_js/bt.js static/js/bt.min.js
./node_modules/uglify-js/bin/uglifyjs static/js/bt.min.js -c -m -o static/js/bt.min.js
node main.js
