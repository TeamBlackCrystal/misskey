<template>
<div class="qjewsnkg" v-if="hide" @click="hide = false">
	<img-with-blurhash class="bg" :hash="image.blurhash" :title="image.name"/>
	<div class="text">
		<div>
			<b><fa :icon="faExclamationTriangle"/> {{ $t('sensitive') }}</b>
			<span>{{ $t('clickToShow') }}</span>
		</div>
	</div>
</div>
<div class="gqnyydlz" :style="{ background: color }" v-else>
	<a
		:href="image.url"
		:title="image.name"
	>
		<img-with-blurhash :hash="image.blurhash" :src="url" :alt="image.name" :title="image.name" :cover="false"/>
		<div class="gif" v-if="image.type === 'image/gif'">GIF</div>
	</a>
	<i><fa :icon="faEyeSlash" @click="hide = true"/></i>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import { faExclamationTriangle, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import i18n from '../../../i18n';
import ImageViewer from './image-viewer.vue';
import { getStaticImageUrl } from '../../../common/scripts/get-static-image-url';
import { extractAvgColorFromBlurhash } from '../../../common/scripts/extract-avg-color-from-blurhash';
import ImgWithBlurhash from './img-with-blurhash.vue';

export default Vue.extend({
	i18n: i18n('common/views/components/media-image.vue'),
	components: {
		ImgWithBlurhash
	},
	props: {
		image: {
			type: Object,
			required: true
		},
		raw: {
			default: false
		}
	},
	data() {
		return {
			hide: true,
			color: null,
			faExclamationTriangle, faEyeSlash,
		};
	},
	computed: {
		url(): any {
			let url = this.$store.state.device.disableShowingAnimatedImages
				? getStaticImageUrl(this.image.thumbnailUrl)
				: this.image.thumbnailUrl;

			if (this.raw || this.$store.state.device.loadRawImages) {
				url = this.image.url;
			}

			return url;
		}
	},
	created() {
		// Plugin:register_note_view_interruptor を使って書き換えられる可能性があるためwatchする
		this.$watch('image', () => {
			this.hide = (this.$store.state.device.alwaysShowNsfw) ? true : this.image.isSensitive && (!this.$store.state.device.alwaysShowNsfw);
			if (this.image.blurhash) {
				this.color = extractAvgColorFromBlurhash(this.image.blurhash);
			}
		}, {
			deep: true,
			immediate: true,
		});
	},
});
</script>

<style lang="stylus" scoped>
.qjewsnkg
	position relative

	> .bg
		filter brightness(0.5)

	> .text
		position absolute
		left 0
		top 0
		width 100%
		height 100%
		z-index 1
		display flex
		justify-content center
		align-items center

		> div
			display table-cell
			text-align center
			font-size 0.8em
			color #fff

			> *
				display block

.gqnyydlz
	position relative

	> i
		display block
		position absolute
		border-radius 6px
		background-color var(--text)
		color var(--secondary)
		font-size 14px
		opacity .5
		padding 3px 6px
		text-align center
		cursor pointer
		top 12px
		right 12px

	> a
		display block
		cursor zoom-in
		overflow hidden
		width 100%
		height 100%
		background-position center
		background-size contain
		background-repeat no-repeat

		> .gif
			background-color var(--text)
			border-radius 6px
			color var(--secondary)
			display inline-block
			font-size 14px
			font-weight bold
			left 12px
			opacity .5
			padding 0 6px
			text-align center
			top 12px
			pointer-events none

</style>
