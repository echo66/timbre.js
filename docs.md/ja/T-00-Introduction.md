Introduction
============
What is timbre.js?

timbre.js は lisp のような簡潔な記述をアイデアの出発点として [jQuery](http://jquery.com/) や [node.js](http://nodejs.org/) などの先進的なインターフェイスを参考に開発された [SuperCollider](http://supercollider.sourceforge.net/) のようにガリガリ書ける [Max/MSP](http://cycling74.com/) のようなオブジェクト指向サウンドプログラミング用の JavaScript ライブラリです。このプロジェクトは GitHub でホストされています。

## Supports ##
timbre.js は Chrome, Safari, Firefox, node.js, オプションとして Opera をサポートします。

開発は主に Mac版Chrome で行っています。バグや仕様上の不備を発見した場合 [twitter](http://twitter.com/mohayonao/) または [GitHub Issues](https://github.com/mohayonao/timbre.js/issues) で報告していただけると非常に助かります。

## Installation ##
ミニファイされた [timbre.js](/timbre.js/timbre.js) と開発用の [timbre.dev.js](/timbre.dev.js) があります。

```html
<script src="./timbre.js"></script>
```

多くのJavaScriptライブラリと同じようにたったこれだけで、 timbre.js を利用する準備が整います。timbre.js はグローバル変数 `timbre` と省略形の `T` を使用します。下のコードをクリックしてみてください。"nop" 以外が表示されるのなら使用中のブラウザで timbre.js の実行が可能です。
