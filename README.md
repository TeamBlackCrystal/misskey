JA | [EN](README.en-US.md)

----------------------------------------------------------------

<h1 align="center">Ayuskey</h1>

<div align="center">

[![][e2e-badge]][e2e-link]

[![][fork-of-badge]][fork-of-link]
[![][summaly-badge]][summaly-link]
[![][mfmjs-badge]][mfmjs-link]

Ayuskeyはこの世界のどこかで生まれたMisskey v11のフォークです。
Fediverseの世界に漂うため、Misskeyをはじめとした他のソーシャルメディアプラットフォームと相互につながることができます。

</div>

----------------------------------------------------------------

## 公式インスタンス

* <https://kr.akirin.xyz>
* <https://ne.akarinext.org>

## ドキュメント

* [misskeyからの移行](https://github.com/sousuke0422/notes/blob/master/misskey/migrate-misskey-to-ayuskey.md)
* [Ayuskey Hub](https://ayuskey-hub.readthedocs.io/)

## クライアント

* [TenCha](https://github.com/coke12103/TenCha)
  * isLadyをサポート

## ライブラリ

* [Mi.py](https://github.com/yupix/Mi.py)
  * **プレビュー版**
  * bot向けフレームワーク
  * ayuskey動作保証、misskey(v12)対応

<details>
<summary>内部</summary>

* [@ayuskey/summaly](https://github.com/TeamBlackCrystal/summaly)
  * 微調整が施されたsummaly

</details>

## Contribution

* [コントリビューションガイド](CONTRIBUTING.md)をご確認ください。
* 翻訳を行い場合は[GitLocalize](https://gitlocalize.com/repo/6356)が利用できます。
  * プルリクエストを直接送ることも可能です、新規項目以外は推奨されません。

### Collaborators

<table>
 <tr>
  <td><img src="https://avatars.githubusercontent.com/u/33174568?s=120&v=4"></img></td>
	<td><img src="https://avatars.githubusercontent.com/u/50538210?s=120&v=4"></img></td>
 </tr>
 <tr>
  <td align="center"><a href="https://github.com/sousuke0422">@sousuke0422</a></td>
	<td align="center"><a href="https://github.com/yupix">@yupix</a></td>
 </tr>
</table>

## Screenshots

<p align="center">
  <img src="https://s3.akarinext.org/assets/*/ayuskey-desk-3.png" alt="Ayuskey">
</p>

<p align="center">
  <img src="https://kr.akirin.xyz/files/e21b4c19-61ef-4ab0-9522-a9f98ded2174/e21b4c19-61ef-4ab0-9522-a9f98ded2174.png" alt="Ayuskey Deck">
</p>

[e2e-link]:      https://github.com/TeamBlackCrystal/misskey/actions/workflows/e2e.yml
[e2e-badge]:     https://img.shields.io/github/workflow/status/TeamBlackCrystal/misskey/Ayuskey%20E2E%20Test?label=E2E%20Test&style=flat-square
[fork-of-link]:  https://github.com/syuilo/misskey/tree/v11
[fork-of-badge]: https://img.shields.io/badge/fork%20of-misskey--dev%2Fmisskey-important.svg?style=flat-square
[summaly-link]:  https://www.npmjs.com/package/@ayuskey/summaly
[summaly-badge]: https://img.shields.io/badge/summaly-%40ayuskey%2Fsummaly-blue.svg?style=flat-square
[mfmjs-link]:    https://github.com/TeamBlackCrystal/misskey/issues/222
[mfmjs-badge]:   https://img.shields.io/badge/mfm.js-none(%23222)-blue.svg?style=flat-square
