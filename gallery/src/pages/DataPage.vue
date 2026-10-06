<script setup lang="ts">
/**
 * Data-display catalogue: badge, tag, detail list, link, icon.
 *
 * What a value *is* — a file name, a size, a tone name — is copy and follows
 * the language switcher. What a value *contains* is not touched: icon names,
 * tone identifiers and the file names in the samples stay as they are, because
 * they are the labels a developer matches against the code.
 */
import { computed, ref } from 'vue'
import {
  JinAlert,
  JinBadge,
  JinButton,
  JinCard,
  JinDetailList,
  JinDivider,
  JinIcon,
  JinLink,
  JinTag,
  ICON_PATHS,
  type DetailItem,
  type IconName,
  type TranslateVars,
} from '@bythid/jin'
import { DemoPage, DemoSection } from '../demo/DemoSection'
import { useI18n } from '../i18n'

defineProps<{ section?: string | null }>()

const { t } = useI18n()

// ------------------------------------------------------------------ badge
interface DemoTab {
  key: string
  vars?: TranslateVars
}

const tags = ref<DemoTab[]>([
  { key: 'data.tag.inbox' },
  { key: 'data.tag.flagged' },
  { key: 'data.tag.later' },
])
const tagLabels = computed(() => tags.value.map((tag) => t(tag.key, tag.vars)))

function addTag(): void {
  tags.value = [...tags.value, { key: 'data.tag.tagName', vars: { index: tags.value.length + 1 } }]
}

function removeTag(index: number): void {
  tags.value = tags.value.filter((_, position) => position !== index)
}

// ------------------------------------------------------------ detail list
const fileDetails = computed<DetailItem[]>(() => [
  { key: 'name', label: t('data.detail.name'), value: t('data.detail.fileName') },
  { key: 'size', label: t('data.detail.size'), value: t('data.detail.fileSize') },
  { key: 'modified', label: t('data.detail.modified'), value: t('data.detail.fileModified') },
  { key: 'owner', label: t('data.detail.owner'), value: t('data.detail.fileOwner') },
  { key: 'checksum', label: t('data.detail.checksum'), value: 'sha256:9f2c…d41a' },
  { key: 'note', label: t('data.detail.noteLabel'), value: null },
  { key: 'secret', label: t('data.detail.internalId'), value: t('data.detail.hidden'), hidden: true },
])

// ------------------------------------------------------------------- link
const linkClicks = ref(0)

// ------------------------------------------------------------------- icon
const iconNames = Object.keys(ICON_PATHS) as IconName[]

const composedDetails = computed<DetailItem[]>(() => [
  { key: 'status', label: t('data.detail.status'), value: t('data.detail.ready') },
  { key: 'entries', label: t('data.detail.entries'), value: t('data.detail.entryCount') },
  { key: 'owner', label: t('data.detail.owner'), value: null },
])
</script>

<template>
  <DemoPage :title="t('data.title')" :lead="t('data.lead')">
    <DemoSection id="badge" :title="t('data.badge.title')" :note="t('data.badge.note')">
      <div style="display: flex; flex-direction: column; gap: var(--jin-space-4)">
        <div style="display: flex; flex-wrap: wrap; gap: var(--jin-space-2); align-items: center">
          <JinBadge tone="neutral" :label="t('common.tone.neutral')" />
          <JinBadge tone="accent" :label="t('common.tone.accent')" />
          <JinBadge tone="info" :label="t('common.tone.info')" />
          <JinBadge tone="success" :label="t('common.tone.success')" />
          <JinBadge tone="warning" :label="t('common.tone.warning')" />
          <JinBadge tone="danger" :label="t('common.tone.danger')" />
        </div>

        <div style="display: flex; flex-wrap: wrap; gap: var(--jin-space-4); align-items: center">
          <JinBadge variant="dot" tone="success" :label="t('data.badge.online')" />
          <JinBadge variant="dot" tone="warning" :label="t('data.badge.degraded')" />
          <JinBadge variant="dot" tone="danger" :label="t('data.badge.offline')" />
          <span class="gallery-muted">{{ t('data.badge.dotExplain') }}</span>
        </div>

        <div style="display: flex; flex-wrap: wrap; gap: var(--jin-space-2); align-items: center">
          <JinBadge tone="neutral" label="12" />
          <JinBadge tone="danger" label="99+" />
          <JinBadge tone="info">{{ t('data.badge.slotContent') }}</JinBadge>
          <span class="gallery-muted">{{ t('data.badge.valueContainer') }}</span>
        </div>
      </div>
    </DemoSection>

    <DemoSection id="tag" :title="t('data.tag.title')" :note="t('data.tag.note')" stacked>
      <div class="jin-cluster">
        <JinTag
          v-for="(tag, index) in tags"
          :key="`${tag.key}-${index}`"
          :label="tagLabels[index]"
          tone="accent"
          removable
          @remove="removeTag(index)"
        />
        <JinButton v-if="tags.length < 5" size="sm" variant="ghost" @click="addTag">
          <template #icon><JinIcon name="plus" /></template>
          {{ t('data.tag.add') }}
        </JinButton>
        <span v-if="tags.length === 0" class="gallery-muted">{{ t('data.tag.allRemoved') }}</span>
      </div>

      <div class="jin-cluster">
        <JinTag :label="t('common.tone.neutral')" tone="neutral" />
        <JinTag :label="t('common.tone.info')" tone="info" />
        <JinTag :label="t('common.tone.success')" tone="success" />
        <JinTag :label="t('common.tone.warning')" tone="warning" />
        <JinTag :label="t('common.tone.danger')" tone="danger" />
        <JinTag :label="t('data.tag.notRemovable')" />
      </div>
    </DemoSection>

    <DemoSection id="detail-list" :title="t('data.detail.title')" :note="t('data.detail.note')" stacked>
      <div class="gallery-grid gallery-grid--two">
        <JinDetailList :items="fileDetails" />
        <JinDetailList :items="fileDetails.slice(0, 4)" striped :bordered="false" />
        <JinDetailList :items="fileDetails.slice(0, 3)" compact :empty-text="t('data.detail.notSet')" />
        <JinCard
          :title="t('data.detail.insideCard')"
          :description="t('data.detail.insideCardDescription')"
        >
          <JinDetailList :items="composedDetails" :bordered="false">
            <template #value="{ item }">
              <JinBadge
                v-if="item.key === 'status'"
                tone="success"
                :label="String(item.value)"
              />
              <span v-else-if="item.value === null" class="gallery-muted">
                {{ t('data.detail.unassigned') }}
              </span>
              <span v-else>{{ item.value }}</span>
            </template>
          </JinDetailList>
        </JinCard>
      </div>

      <JinAlert
        tone="info"
        :title="t('data.detail.whyNotTableTitle')"
        :description="t('data.detail.whyNotTableDescription')"
      />
    </DemoSection>

    <DemoSection id="link" :title="t('data.link.title')" :note="t('data.link.note')">
      <JinLink href="#section">{{ t('data.link.plain') }}</JinLink>
      <JinLink href="#section" muted>{{ t('data.link.muted') }}</JinLink>
      <JinLink href="https://example.com" external>{{ t('data.link.external') }}</JinLink>
      <JinLink href="#section" @click="linkClicks += 1">
        {{
          linkClicks === 1
            ? t('data.link.clickedOne', { count: linkClicks })
            : t('data.link.clickedOther', { count: linkClicks })
        }}
      </JinLink>
      <JinLink href="#section" disabled>{{ t('data.link.disabled') }}</JinLink>
      <JinLink>{{ t('data.link.noHref') }}</JinLink>
    </DemoSection>

    <DemoSection id="icon" :title="t('data.icon.title')" :note="t('data.icon.note')" stacked>
      <div
        style="
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: var(--jin-space-2);
          width: 100%;
        "
      >
        <div
          v-for="name in iconNames"
          :key="name"
          style="display: flex; align-items: center; gap: var(--jin-space-2); min-width: 0"
        >
          <JinIcon :name="name" :size="1.2" />
          <span class="gallery-mono" style="overflow: hidden; text-overflow: ellipsis">{{ name }}</span>
        </div>
      </div>

      <JinDivider />

      <div style="display: flex; align-items: center; gap: var(--jin-space-4)">
        <JinIcon name="star" :size="1" />
        <JinIcon name="star" :size="1.5" />
        <JinIcon name="star" :size="2" />
        <JinIcon name="star" :size="3" />
        <span class="gallery-muted">{{ t('data.icon.sizes') }}</span>
      </div>

      <div style="display: flex; align-items: center; gap: var(--jin-space-4)">
        <JinIcon name="check" :label="t('data.icon.available')" />
        <span class="gallery-muted">{{ t('data.icon.labelled') }}</span>
        <JinIcon name="check" />
        <span class="gallery-muted">{{ t('data.icon.unlabelled') }}</span>
      </div>
    </DemoSection>

    <DemoSection :title="t('data.contrast.title')" :note="t('data.contrast.note')" stacked>
      <div class="gallery-grid gallery-grid--three">
        <JinCard
          :title="t('data.contrast.statusTitle')"
          :description="t('data.contrast.statusDescription')"
        >
          <div class="jin-stack">
            <div style="display: flex; align-items: center; gap: var(--jin-space-2)">
              <JinIcon name="success" />
              <JinBadge tone="success" :label="t('data.detail.ready')" />
            </div>
            <div style="display: flex; align-items: center; gap: var(--jin-space-2)">
              <JinIcon name="warning" />
              <JinBadge tone="warning" :label="t('data.badge.degraded')" />
            </div>
            <div style="display: flex; align-items: center; gap: var(--jin-space-2)">
              <JinIcon name="danger" />
              <JinBadge tone="danger" :label="t('data.contrast.blocked')" />
            </div>
          </div>
        </JinCard>

        <JinCard :title="t('data.contrast.valueTitle')" :description="t('data.contrast.valueDescription')">
          <JinDetailList
            :items="[
              { key: 'a', label: t('data.contrast.total'), value: t('data.detail.entryCount') },
              { key: 'b', label: t('data.contrast.failed'), value: '3' },
              { key: 'c', label: t('data.contrast.skipped'), value: '0' },
            ]"
            :bordered="false"
            compact
          />
        </JinCard>

        <JinCard
          :title="t('data.contrast.wordingTitle')"
          :description="t('data.contrast.wordingDescription')"
        >
          <div class="jin-stack">
            <JinAlert
              tone="success"
              :title="t('data.contrast.savedTitle')"
              :description="t('data.contrast.savedDescription')"
            />
            <JinAlert
              tone="danger"
              :title="t('data.contrast.failedTitle')"
              :description="t('data.contrast.failedDescription')"
            />
          </div>
        </JinCard>
      </div>
    </DemoSection>
  </DemoPage>
</template>
