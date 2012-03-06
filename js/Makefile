all: git-canvas.min.js

git-canvas.min.js: git-canvas.js
	cat inherit.js git-canvas.js | uglifyjs > git-canvas.min.js
