# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- roomにbook3が実装されました
  - Misskey完全攻略ガイドブックのv12版です
- ファイルサイズ上限が実装されました。config上の`maxFileSize`から設定できます。
  - デフォルトは`262144000B`
- オブジェクトストレージの`S3ForcePathStyle`を指定できるように
- 藍ちゃんウィジェット
- アカウント削除の連合

### Changed

- 対応していないものはfalseかnullを返すように (`api:meta`)
- オンライン状態の仕様をv12と同じものに

### Fixed

- 一部の条件下(DMなど)で既読がつかない問題を修正
- アンテナに既読がつくようになりました
- 空のプッシュ通知が発生しないように
- アカウント削除の安定性を向上

## [11.37.1-rei0784-5.16.0] 2021-09-12

### Security

- XSS GHSA-669q-w6qc-75h3
  - 5.15.1へバックポートされています
- SSRF GHSA-x9q4-5jhg-9mpf
  - URLからのアップロード, APの添付ファイル, 外部ファイルのプロキシ等では、Privateアドレス等へのリクエストは拒否されるようになりました。
    - developmentで動作している場合は、この制限は適用されません。
    - Proxy使用時には、この制限は適用されません。 Proxy使用時に同等の制限を行いたい場合は、Proxy側で設定を行う必要があります。
    - default.ymlにてallowedPrivateNetworksにCIDRを追加することにより、宛先ネットワークを指定してこの制限から除外することが出来ます。

### Added

- html mail
- Job Queueが詰まったとき音を鳴らす機能
- `$[fn text]`のタイプのmfmとの簡易的な互換性確保(ネストは不可)
- v12互換の通知api
- Channels API
- Clip API
- tokenを消せるように
- リアクション数の取得

### Fixed

- アンテナが動作するようになりました
  - 既読がつかない既知の不具合があります

### Changed

- 不明な絵文字(mastodon等のlike含む)のフォールバックが👍ではなく⭐がデフォルトに
  - 👍にしたい場合は設定が必要です
- 改造以前の音源の場所を変更
- リモートユーザーの一定以上のbioとnameを切り捨てるように
- 検索を調整(`host:address`形式のみ)
- CSPやCookieの調整
- TLに流れてくる画像をv12と同じ感じに

### Removed

- 不要な音源を削除

## [11.37.1-rei0784-5.15.0] 2021-08-22

### Added

- pizzaxを部分的に移植
- Array ActivityStreams typeのサポート

### Fixed

- dockerのコンテナがビルドできない
- ドキュメント内のgithubへ飛ぶリンクが古いのが修正されました。
- InBoxのDelayed発生が軽減されました
  - not reacted な Undo.Like がinboxに滞留するのを修正
  - AP Delate Activityの修正
  - 存在しないユーザーの削除をリトライしない
- リモートドライブの不具合修正
- AP Actorの修正
- inboxのバグ修正
- roomの不具合修正
- 特定条件でログアウトさせられる問題を修正

### Changed

- 音の鳴らし方がv12と同様になりました。
  - 古い音源は次のバージョンで削除予定です。
- ActivityPub: ジョブキューの試行タイミングを調整
- bioと名前の上限を緩和
- job queueの調整

### Removed

- 不要になったためコンテナ内からvipsを削除

## [11.37.1-rei0784-5.14.0] - 2021-08-12

### Added

- 5.11.2からたくさんの機能が追加されました

### Fixed

- 5.11.2から検索した際プログレスバーが検索し終わっても消えないなどのいくつかのバグが修正されています。
- beta.6からの修正
  - 仕様を以前の戻し、絵文字表示バグに終止符を打ちました。

## [11.37.1-rei0784-5.14.0-beta.6] - 2021-08-12

### Added

- 言語ファイルにwelcomeのタグリストが空の際の言語を追加
- ウィジェットにv12仕様のjob queueを追加
- キャッシュを消す機能を追加
- フォロー/ミュート/ブロック インポートでファイル名を見るように

### Fixed

- 同じインスタンスからの絵文字が通知欄に表示されない
- 検索した際プログレスバーが検索し終わっても消えない
- welcomeページのタイムラインで画像が表示されない
- welcomeページで管理者が設定されていない場合空白が表示される
- パスワードを空に変更できてしまうのを修正 Fix [mei23#1455](https://github.com/mei23/misskey-v11/issues/1455)
- 投票に数字で終わるリプライを付けられているとinboxで処理できないのを修正 Fix [mei23#1522](https://github.com/mei23/misskey-v11/issues/1522)

### Changed

- Tokenの生成方法を変更
- Twitterウィジットが使える時はプレイヤーを使わないように

### Removed

- テーマの状態をログに出していた物を削除

## [11.37.1-rei0784-4.0.0] - 2020-11-01

### Added

- お嬢様スイッチを追加
- 検索窓がびよ～んするようになった

### Fixed

- docker環境においてfilesをマウントするように
- 内部的な修正をたくさん

[Unreleased]: https://github.com/TeamBlackCrystal/misskey/compare/11.37.1-rei0784-5.15.0...HEAD
[11.37.1-rei0784-5.15.0]: https://github.com/TeamBlackCrystal/misskey/compare/11.37.1-rei0784-5.14.0...11.37.1-rei0784-5.15.0
[11.37.1-rei0784-5.14.0]: https://github.com/TeamBlackCrystal/misskey/compare/11.37.1-rei0784-5.14.0-beta.6...11.37.1-rei0784-5.14.0
[11.37.1-rei0784-5.14.0-beta.6]: https://github.com/TeamBlackCrystal/misskey/compare/11.37.1-rei0784-5.14.0-beta.5...11.37.1-rei0784-5.14.0-beta.6
[11.37.1-rei0784-4.0.0]: https://github.com/TeamOrangeServer/misskey/compare/v3.6.0...v11.37.1-rei0784-4.0.0
