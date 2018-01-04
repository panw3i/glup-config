/* jshint node:true */
'use strict';
// generated on 2015-10-15 using generator-gulp-webapp 0.2.0
//使用require把gulp引入进来
var gulp = require('gulp');
/**
 * 读取package.json中的devDependencies配置项，调用gulp api把相关的插件加载进来
 * 返回一个object,每个key指向各自的插件，把对象赋值给 $,后面可以用$获取每个插件的引用
 * 如果不使用gulp-load-plugins,就可以使用require引入插件 如
 *  var sass = require('gulp-sass');
 *
 */
var $ = require('gulp-load-plugins')();

/**
 * 1.此插件是用来编译sass的
 * 2.
 */
gulp.task('styles', function () {
  //把执行结果返回，以便此任务可以跟后续的任务配合依次执行。将多个小的操作进行组合，连接在一起就是流，数据依次从源头穿过一个个的管道，依次执行，最终在底部得到结果，可以很好的进行数据的转换
  return gulp.src('app/styles/main.scss')//读取此文件到数据流中
  /**
   * 1.pipe是steam模块中负责传递流数据的方法，把前一个流里的数据以管道的方式传递给下一个管道。
   * 2.标准的流当期中一个管道出错的时候会触发unpipe事件，会导致gulp报错并强制退出
   * 我们现在监听main.scss文件的变化，一旦变化时会执行rubySass,但如果sass有语法错误，执行rubySass的时候会报错，会导致gulp报错并强制退出从而导致整个任务失败，watch就会失败，只能重启gulp服务。
   * 然后不停的失败再重启，这样肯定是不可接受的。
   * 3.plumber是水管工的意思，plumber通过替换pipe方法并移除onerror处理函数，这样即使有管道出问题了不会影响其它管道以及影响其它后续数据流的再处理。
   * 当我们希望我们的管道能容忍容错的时候，就必须先通过plumber插件。
   */
      .pipe($.plumber())
  /**
   * 通过 npm install gulp-ruby-sass 安装
   */
      .pipe($.rubySass({
        style: 'expanded',// 设置编译出来的模式为expanded模式，一共有四种 nested(层级选择器嵌套) expanded(不嵌套) compact(属性合合并在一行) compressed(全部合并到一行)，请参考 http://sass-lang.com/documentation/file.SASS_REFERENCE.html#_13
        precision: 10 //属性保留几位小数点 因为sass支持表达式，比如10/3,那么除不尽会有小数，我们尽可能保留完整，如果不能保留10位
      }))
    //需要厂商前缀的属性自动添加厂商前缀，只适配每种浏览器最新的一个版本
      .pipe($.autoprefixer({browsers: ['last 1 version']}))
    //处理完成后把流数据写入.tmp/styles目录
      .pipe(gulp.dest('.tmp/styles'));
});

gulp.task('jshint', function () {
  //对scripts目录下的JS进行校验，使用.jshintrc作为配置文件
  //配置文件说明 http://jinlong.github.io/2014/10/25/jshint-configuration/?utm_source=tuicool
  return gulp.src('app/scripts/**/*.js')
      .pipe($.jshint())
    //校验结果传递给jshint-stylish reporter
      .pipe($.jshint.reporter('jshint-stylish'))//传递的是report的名称
    //当校验没通过时会通过stylish记录下错误信息并传递给fail reporter,并使当前任务失败
      .pipe($.jshint.reporter('fail'));
});

gulp.task('html', ['styles'], function () {
  //lazypipe用来缓存一组管道配置，存起来稍后使用
  var lazypipe = require('lazypipe');

  var cssChannel = lazypipe()
    //注意传递的是插件对象而不是插件方法调用
    //csso用来压缩css文件
      .pipe($.csso)
    //替换内容
      .pipe($.replace, 'bower_components/bootstrap-sass-official/assets/fonts/bootstrap','fonts');
  //通过解析html中的注释块来处理替换html中那些未经合并压缩的JS CSS等资源的引入
  //分成二步  assets 和 useref
  // assets方法用来生成检索资源文件的管道
  var assets = $.useref.assets({searchPath: '{.tmp,app}'});//指定在哪些目录中搜索 html文件，是相对于gulp

  return gulp.src('app/*.html')
      .pipe(assets)//检索传递进来的html文件，按注释指令对这些文件进行合并，然后生成一个新的流，将之前的HTML文件替换掉,新增加合并合的资源文件
      .pipe($.if('*.js', $.uglify()))//符合条件才能进入后面的流，如果是JS进行压缩再回归到主流
      .pipe($.if('*.css', cssChannel()))//如果是CSS文件，则先压缩CSS再替换fonts路径
      .pipe(assets.restore())//再回到主流，把删除的HTML文件添加回来
      .pipe($.useref())//修改原来注释块用修改后的引用地址替换掉原来的地址
      .pipe($.if('*.html', $.minifyHtml({conditionals: true/*true不移除针对IE的注释*/, loose: true/*压缩空格的时候至少保留一个空格*/})))//如果是html文件，则进行压缩
      .pipe(gulp.dest('dist'));//把处理后的文件输出到dist目录
});

gulp.task('images', function () {
  return gulp.src('app/images/**/*')//把图片读取入流中
  /**
   * 为了避免图片多次压缩失真
   * imagemin只负责压缩图片，不负责检查图片是否被压缩过
   * 为了避免二次压缩使用$.cache，维护一份临时文件记录哪些文件已经被处理过了，处理过了则不再传递给它包装的管道。
   */
      .pipe($.cache($.imagemin({
        progressive: true,//针对jpg 图像逐行扫描，先以比较模糊的方式出现，再清晰。
        interlaced: true //针夺gif,隔行扫描的方式。比如先出奇数行，再出偶数行，一半的时间就可以看到轮廓。
      })))
      .pipe(gulp.dest('dist/images'));//输出到images目录
});

gulp.task('fonts', function () {
  //main-bower-files 读取所有的bower的文件并合并上所有的字体文件读取入流
  return gulp.src(require('main-bower-files')().concat('app/fonts/**/*'))
      .pipe($.filter('**/*.{eot,svg,ttf,woff}'))//类似于if,符合流转，不符合则被剔除
      .pipe($.flatten())//将相对路径移除
      .pipe(gulp.dest('dist/fonts'));//将字体文件写入fonts目录
});
//将app下除了html以外的文件拷贝到dist目录 只拷贝一级
gulp.task('extras', function () {
  return gulp.src([
    'app/*.*',
    '!app/*.html',
    'node_modules/apache-server-configs/dist/.htaccess'//拷贝apache配置文件
  ], {
    dot: true// node glob配置项，true时匹配以.开头的文件或文件夹
  }).pipe(gulp.dest('dist'));
});
//删除.tmp和dist下的所有文件
gulp.task('clean', require('del').bind(null, ['.tmp', 'dist']));
//等同于 gulp.task('clean',function(){require('del')(['.tmp','dist'])});

/**
 * 1.connect会依赖styles
 * 2.这是一个node扩展的http框架，可以使用中间件方便配置
 */
gulp.task('connect', ['styles'], function () {
  var serveStatic = require('serve-static');//静态文件服务器中间件
  var serveIndex = require('serve-index');//显示索引文件中间件
  var app = require('connect')()//先创建connect对象叫app
  /**
   * 此中间件就是自动为html插入livereload脚本，通过参数传递配置项参数
   */
      .use(require('connect-livereload')({port: 35729}))//实时重启服务器中间件
      .use(serveStatic('.tmp'))//对根目录的请求映射到.tmp目录
      .use(serveStatic('app'))//对根目录的请求映射到app目录
    //将对bower_components目录的访问定位到bower_components目录下
      .use('/bower_components', serveStatic('bower_components'))
    //参数为本地的一个文件目录，当路径命中这个目录的时候，而路径下没有index文件的时候会显示目录索引文件显示此目录下的所的文件
      .use(serveIndex('app'));
  //加载http组件并创建http服务器，传入的参数app就是一个请求监听处理函数
  //当服务器接受请求的时候，会依次执行上面的一系列中间件，其实就是用请求路径在相应的文件夹里进行匹配，如果匹配上就返回
  require('http').createServer(app)
      .listen(9000)
    //服务器监听成功后会输出此信息
      .on('listening', function () {
        console.log('Started connect web server on http://localhost:9000');
      });
});

/**
 * 1. 在命令行中执行 gulp serve 就可以自动打开浏览器，然后修改app/index.html就会实时刷新浏览器
 * 2.因为watch依赖connect,所以这里connect可以省略
 * 3.
 *
 */
gulp.task('serve', ['connect', 'watch'], function () {
  //打开浏览器并打开指定的URL地址
  require('opn')('http://localhost:9000');
});

//插入bower_component文件
gulp.task('wiredep', function () {
  var wiredep = require('wiredep').stream;
  //先处理sass文件对bower_component文件的依赖
  gulp.src('app/styles/*.scss')
      .pipe(wiredep())
      .pipe(gulp.dest('app/styles'));

  //处理app下的html文件对bower_component文件的依赖
  gulp.src('app/*.html')
      .pipe(wiredep({exclude: ['bootstrap-sass-official']}))//排除bootstrap-sass-official
      .pipe(gulp.dest('app'));
});

/**
 * 1. watch依赖connect执行
 * 2.
 */
gulp.task('watch', ['connect'], function () {
  /**
   * 1.先调用livereload的listen方法启动监听,这样文件发生改动时就可以接收到变化通知了
   * 原理都是一样的，即通过在本地开启一个websocket服务，检测文件变化，当文件被修改后触发livereload任务，推送消息给浏览器刷新页面。详情参考
   * http://blog.csdn.net/u010373419/article/details/38184333?utm_source=tuicool
   */
  $.livereload.listen();

  //监听文件的变化，当文件发生变化的时候重启服务器
  //gulp.watch返回的一个eventEmitter对象，通过on change可以添加事件监听 ，当watch监控这些文件发生变化的时候可以发射change事件，从而调用$.livereload.changed监听函数执行，这就是订阅者设计模式
  //监听函数可以获得哪些文件发生了改变，通过livereload服务器哪些文件变更了，
  gulp.watch([
    'app/*.html',
    '.tmp/styles/**/*.css',
    'app/scripts/**/*.js',
    'app/images/**/*'
  ]).on('change', $.livereload.changed);
  //当scss文件变化的时候重新编译sass
  gulp.watch('app/styles/**/*.scss', ['styles']);
  //当bower.json文件发生变化的时候自动重启把依赖的组件引入html文件
  gulp.watch('bower.json', ['wiredep']);
});

/**
 *编译
 *
 */
gulp.task('build', ['jshint', 'html', 'images', 'fonts', 'extras'], function () {
  //size展示文件大小以及总的大小 gzip为true展示gzip压缩后的文件大小,展示的是项目的总大小
  return gulp.src('dist/**/*').pipe($.size({title: 'build', gzip: true}));
});

/**
 * 组合任务
 *
 */
gulp.task('default', ['clean'], function () {
  gulp.start('build');//start 可以运行build任务
});