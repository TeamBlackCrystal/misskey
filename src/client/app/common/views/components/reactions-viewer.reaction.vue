<template>
<span
	class="reaction"
	:class="{ reacted: note.myReaction == reaction, canToggle }"
	@click="toggleReaction(reaction)"
	v-if="count > 0"
	@touchstart="onMouseover"
	@mouseover="onMouseover"
	@mouseleave="onMouseleave"
	@touchend="onMouseleave"
	ref="reaction"
>
	<mk-reaction-icon :reaction="reaction" :customEmojis="note.emojis" ref="icon"/>
	<span>{{ count }}</span>
</span>
</template>

<script lang="ts">
import Vue from 'vue';
import Icon from './reaction-icon.vue';
import anime from 'animejs';
import XDetails from './reactions-viewer.details.vue';

export default Vue.extend({
	props: {
		reaction: {
			type: String,
			required: true,
		},
		count: {
			type: Number,
			required: true,
		},
		isInitial: {
			type: Boolean,
			required: true,
		},
		note: {
			type: Object,
			required: true,
		},
	},
	data() {
		return {
			details: null,
			detailsTimeoutId: null,
			isHovering: false
		};
	},
	computed: {
		canToggle(): boolean {
			return !this.reaction.match(/@\w/);
		},
	},
	mounted() {
		if (!this.isInitial) this.anime();
	},
	watch: {
		count(newCount, oldCount) {
			if (oldCount < newCount) this.anime();
			if (this.details != null) this.openDetails();
		},
	},
	methods: {
		toggleReaction() {
			if (!this.canToggle) return;

			const oldReaction = this.note.myReaction;
			if (oldReaction) {
				this.$root.api('notes/reactions/delete', {
					noteId: this.note.id
				}).then(() => {
					if (oldReaction !== this.reaction) {
						this.$root.api('notes/reactions/create', {
							noteId: this.note.id,
							reaction: this.reaction
						});
					}
				});
			} else {
				this.$root.api('notes/reactions/create', {
					noteId: this.note.id,
					reaction: this.reaction
				});
			}
		},
		onMouseover() {
			this.isHovering = true;
			this.detailsTimeoutId = setTimeout(this.openDetails, 300);
		},
		onMouseleave() {
			this.isHovering = false;
			clearTimeout(this.detailsTimeoutId);
			this.closeDetails();
		},
		openDetails() {
			this.$root.api('notes/reactions', {
				noteId: this.note.id,
				type: this.reaction,
				limit: 11
			}).then((reactions: any[]) => {
				const users = reactions
					.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
					.map(x => x.user);

				this.closeDetails();
				if (!this.isHovering) return;
				this.details = this.$root.new(XDetails, {
					reaction: this.reaction,
					customEmojis: this.note.emojis,
					users,
					count: this.count,
					source: this.$refs.reaction
				});
			});
		},
		closeDetails() {
			if (this.details != null) {
				this.details.close();
				this.details = null;
			}
		},
		anime() {
			if (this.$store.state.device.reduceMotion) return;
			if (document.hidden) return;

			this.$nextTick(() => {
				if (this.$refs.icon == null) return;

				const rect = this.$refs.icon.$el.getBoundingClientRect();

				const x = rect.left;
				const y = rect.top;

				const icon = new Icon({
					parent: this,
					propsData: {
						reaction: this.reaction,
						customEmojis: this.note.emojis
					}
				}).$mount();

				icon.$el.style.position = 'absolute';
				icon.$el.style.zIndex = 100;
				icon.$el.style.top = (y + window.scrollY) + 'px';
				icon.$el.style.left = (x + window.scrollX) + 'px';
				icon.$el.style.fontSize = window.getComputedStyle(this.$refs.icon.$el).fontSize;

				document.body.appendChild(icon.$el);

				anime({
					targets: icon.$el,
					opacity: [1, 0],
					translateY: [0, -64],
					duration: 1000,
					easing: 'linear',
					complete: () => {
						icon.destroyDom();
					}
				});
			});
		},
	}
});
</script>

<style lang="stylus" scoped>
.reaction
	display inline-block
	height 32px
	margin 2px
	padding 0 6px
	border-radius 4px
	cursor default

	&, *
		-webkit-touch-callout none
		-webkit-user-select none
		-khtml-user-select none
		-moz-user-select none
		-ms-user-select none
		user-select none

	*
		user-select none
		pointer-events none

	&.canToggle
		background rgba(0, 0, 0, 0.05)

		&:hover
			background rgba(0, 0, 0, 0.1)

	&.canToggle
		background var(--reactionViewerButtonBg)
		cursor pointer

		&:hover
			background var(--reactionViewerButtonHoverBg)

	&.reacted
		background var(--primary)
		cursor pointer

		> span
			color var(--primaryForeground)

	> span
		font-size 1.1em
		line-height 32px
		color var(--text)
</style>
