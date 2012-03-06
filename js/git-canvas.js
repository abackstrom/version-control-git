var HashCollection = Class.extend({
	init: function(){
		this.childrenHash = {};
		this.children = [];
	},
	push: function( commit ) {
		var i = this.children.push( commit );
		this.childrenHash[commit[this.id_field]] = i - 1;
	},
	each: function( cb ) {
		for( var i = 0, c = this.children.length; i < c; i ++ ) {
			commit = this.children[i];
			cb.apply(commit);
		}
	},
	get: function( id ) {
		var i = this.childrenHash[id];
		return this.children[i];
	},
	exists: function( id ) {
		return typeof this.get(id) != 'undefined';
	}
});

var Commits = HashCollection.extend({
	init: function() {
		this.id_field = 'hash';
		this._super();
	}
});

var Branches = HashCollection.extend({
	init: function() {
		this.line_colors = [ "#D4262F", "#2F8F59", "#F78623", "#2389F7", "#DF23F7" ];
		this.id_field = 'name';
		this.branch_count = 0;
		this._super();
	},
	create: function( branch ) {
		if( this.exists( branch ) ) {
			return this.get( branch );
		}

		branch = new Branch( branch );
		branch.num = this.branch_count++;
		branch.color = this.line_colors.shift();
		this.push( branch );

		return branch;
	}
});

var Branch = Class.extend({
	init: function( name ) {
		this.name = name;
	}
});

var Commit = Class.extend({
	init: function( hash, args ) {
		this.parents = new Commits();

		if ( typeof args.parents != 'undefined' && ! ( args.parents instanceof Array ) ) {
			args.parents = [ args.parents ];
		}

		this.hash = hash;
		this.branch = args.branch;
		this.parents = args.parents || [];
		this.staged = args.staged || false;
	}
});

function git_canvas( config ) {
	var _paper = null,
		_git_canvas = {}, // chainable return object
		_commits = null,
		_branches = null,
		_commit_number = 0,
		_last_commit = null,
		_config = config || {};

	_config.branch_sep  = _config.branch_sep || 50;
	_config.commits_sep = _config.commits_sep || 60;
	_config.stroke      = _config.stroke || 6;
	_config.radius      = _config.radius || 15;

	function commits( commits ) {
		_branches = new Branches();
		_commits = new Commits();
		_last_commit = null;
		_commit_number = 0;

		for( var i = 0, c = commits.length; i < c; i++ ) {
			var row = commits[i],
				commit = null,
				branch = null,
				staged = null,
				parents = null;

			row.branch = row.branch || 'master';
			branch = _branches.create( row.branch );
			staged = row.staged || false;

			if( row.parents == null )
				if( _last_commit )
					parents = [ _last_commit.hash ];
				else
					parents = [];
			else
				parents = row.parents;

			commit = new Commit( row.hash, {
				branch: branch,
				parents: parents,
				staged: staged
			});

			commit.commit_number = _commit_number++;

			_commits.push( commit );
			_last_commit = commit;
		}

		return _git_canvas;
	}
	_git_canvas.commits = commits;

	function draw( id, config ) {
		var _backup_config = {};

		if( typeof config !== 'undefined' ) {
			for( var i in _config ) {
				if( _config.hasOwnProperty(i) ) {
					_backup_config[i] = _config[i];
				}
			}

			_config.branch_sep  = config.branch_sep || _config.branch_sep;
			_config.commits_sep = config.commits_sep || _config.commits_sep;
			_config.stroke      = config.stroke || _config.stroke;
			_config.radius      = config.radius || _config.radius;
		}

		_paper = Raphael( id, ( _commit_number - 1 ) * _config.commits_sep + 2 * _config.radius + _config.stroke,
			( _branches.branch_count - 1 ) * _config.branch_sep + 2 * _config.radius + _config.stroke);

		_commits.each( function(){
			lines( this );
		});

		_commits.each( function(){
			circle( this );
		});

		if( typeof config !== 'undefined' ) {
			_config = _backup_config;
		}

		return _git_canvas;
	}
	_git_canvas.draw = draw;

	function line_to_parent( commit, parent ) {
		var path = ["M", commit.x, commit.y];

		if( parent.branch === commit.branch ) {
			path.push("L", parent.x, parent.y);
		} else if( parent.branch.num < commit.branch.num ) {
			path.push("L", parent.x + _config.commits_sep / 2, commit.y, "L", parent.x, parent.y);
		} else {
			path.push("L", commit.x - _config.commits_sep / 2, parent.y, "L", parent.x, parent.y);
		}

		path = _paper.path(path.join(','));

		if( parent.branch.num < commit.branch.num ) {
			path.attr("stroke", commit.branch.color);
		} else {
			path.attr("stroke", parent.branch.color);
		}

		path.attr("stroke-width", _config.stroke);

		if( commit.staged ) {
			path.attr("stroke-dasharray", ".");
		}
	}

	function lines( commit ) {
		var branch = commit.branch,
			x = _config.commits_sep * commit.commit_number + _config.radius + _config.stroke / 2,
			y = _config.branch_sep * branch.num + _config.radius + _config.stroke / 2;

		commit.x = x;
		commit.y = y;

		// draw the path from here to all parents
		for( var i = 0, len = commit.parents.length; i < len; i ++ ) {
			var parent = _commits.get( commit.parents[i] );
			line_to_parent( commit, parent );
		}
	}

	function circle( commit ) {
		var c = _paper.circle( commit.x, commit.y, _config.radius );

		// draw the commit
		c.attr("fill", "white");
		c.attr("stroke", "#444");
		c.attr("stroke-width", _config.stroke);

		if( commit.staged ) {
			c.attr("stroke-dasharray", ".");
		}
	}

	return _git_canvas;
}
