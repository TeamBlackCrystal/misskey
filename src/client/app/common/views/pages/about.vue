<template>
<div>
	<div class="about815" v-if="meta" :style="{ backgroundImage: meta.bannerUrl ? `url(${meta.bannerUrl})` : null }">
		<header>{{ meta.name }}</header>
		<div class="desc" v-if="meta.description" v-html="meta.description"></div>
	</div>

	<!-- 基本 -->
	<ui-container>
		<template #header><fa :icon="faServer"/> {{ $t('basic') }}</template>
		<div class="items" v-if="meta">
			<div class="item">
				<div class="key">Ayuskey</div>
				<div class="value">v{{ meta.version }}</div>
			</div>
			<div class="item">
				<div class="key">Misskey</div>
				<div class="value">v11.37.1</div>
			</div>
			<div class="item" v-if="meta.maintainer && meta.maintainer.name">
				<div class="key">{{ $t('maintainerName') }}</div>
				<div class="value">{{ meta.maintainer.name}}</div>
			</div>
			<div class="item" v-if="meta.maintainer && meta.maintainer.email">
				<div class="key">{{ $t('maintainerEmail') }}</div>
				<div class="value">{{ meta.maintainer.email }}</div>
			</div>
		</div>
	</ui-container>

	<!-- 統計 -->
	<ui-container>
		<template #header><fa :icon="faChartBar"/> {{ $t('stats') }}</template>
		<div class="items" v-if="stats">
			<div class="item">
				<div class="key">{{ $t('users') }}</div>
				<div class="value">{{ stats.originalUsersCount }}</div>
			</div>
			<div class="item">
				<div class="key">{{ $t('notes') }}</div>
				<div class="value">{{ stats.originalNotesCount }}</div>
			</div>
			<div class="item">
				<div class="key">{{ $t('instances') }}</div>
				<div class="value">{{ stats.instances }}</div>
			</div>
		</div>
	</ui-container>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../i18n';
import { faServer, faChartBar } from '@fortawesome/free-solid-svg-icons';

export default Vue.extend({
	i18n: i18n('common/views/pages/about.vue'),

	data() {
		return {
			meta: null,
			stats: null,
			faServer, faChartBar
		};
	},

	computed: {

	},

	watch: {

	},

	created() {
		this.$root.api('stats', {}, false, true).then((stats: any) => {
			this.stats = stats;
		});
		this.$root.getMeta().then((meta: any) => {
			this.meta = meta;
		});
	},

	mounted() {
		document.title = this.$root.instanceName;
	},
});
</script>

<style lang="stylus" scoped>
.about815
	overflow hidden
	background var(--face)
	color #fff
	text-shadow 0 0 8px #000
	border-radius 6px
	padding 16px
	margin-bottom 16px
	background-position 50%
	background-size cover

	> header
		font-size 20px
		font-weight bold

	> div
		font-size 14px
		opacity 0.8

.items
	color var(--text)

	> .item
		display flex
		padding 1em
		border-bottom solid 1px var(--faceDivider)

		&:last-child
			border-bottom none

		> .value
			margin-left auto
</style>
