<script setup lang="ts">
/**
 * Feedback catalogue: spinner, progress, skeleton, alert, toast, notification,
 * result. Each section shows the full state range the control supports.
 *
 * Anything built from strings is a `computed`, not a constant: switching the
 * language has to re-render the open messages and the labels already on screen,
 * which is the whole reason the Gallery has a language switcher.
 */
import { computed, ref } from 'vue'
import {
  JinAlert,
  JinButton,
  JinDivider,
  JinIcon,
  JinProgress,
  JinResult,
  JinSkeleton,
  JinSpinner,
  JinSwitch,
  useNotifications,
  useToasts,
} from '@bythid/jin'
import { DemoPage, DemoSection, StateGrid } from '../demo/DemoSection'
import { useI18n } from '../i18n'

defineProps<{ section?: string | null }>()

const { t } = useI18n()
const toasts = useToasts()
const notifications = useNotifications()

const determinate = ref(35)
const longText = computed(() =>
  t('feedback.alert.longTitle'),
)

function bump(value: number): void {
  determinate.value = Math.min(100, Math.max(0, value))
}

function spawnToast(tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger'): void {
  toasts.push({
    tone,
    title: t('feedback.toast.spawnTitle', { tone: t(`common.tone.${tone}`) }),
    description: t('feedback.toast.spawnDescription'),
    duration: tone === 'danger' ? 8000 : 4000,
  })
}

function spawnStickyToast(): void {
  toasts.push({
    tone: 'neutral',
    title: t('feedback.toast.stickyTitle'),
    description: t('feedback.toast.stickyDescription'),
    duration: 0,
  })
}

function spawnActionToast(): void {
  toasts.push({
    tone: 'info',
    title: t('feedback.toast.archivedTitle'),
    description: t('feedback.toast.archivedDescription'),
    duration: 6000,
    actions: [
      {
        label: t('feedback.toast.undo'),
        primary: true,
        handler: () =>
          toasts.push({ tone: 'success', title: t('feedback.toast.restoredTitle'), duration: 2500 }),
      },
    ],
  })
}

function spawnNotification(kind: 'plain' | 'actions' | 'danger'): void {
  if (kind === 'plain') {
    notifications.push({
      tone: 'info',
      title: t('feedback.notification.syncTitle'),
      description: t('feedback.notification.syncDescription'),
    })
    return
  }
  if (kind === 'actions') {
    notifications.push({
      tone: 'accent',
      title: t('feedback.notification.updateTitle'),
      description: t('feedback.notification.updateDescription'),
      actions: [
        { label: t('feedback.notification.later'), handler: () => undefined, keepOpen: false },
        { label: t('feedback.notification.installNow'), primary: true, handler: () => undefined, keepOpen: false },
      ],
    })
    return
  }
  notifications.push({
    tone: 'danger',
    title: t('feedback.notification.errorTitle'),
    description: t('feedback.notification.errorDescription'),
    actions: [{ label: t('common.retry'), primary: true, handler: () => undefined, keepOpen: true }],
  })
}

const positions = [
  'top-start',
  'top',
  'top-end',
  'bottom-start',
  'bottom',
  'bottom-end',
] as const

function toastAt(position: (typeof positions)[number]): void {
  toasts.push({
    tone: 'info',
    title: t('feedback.toast.positionTitle', { position }),
    duration: 2500,
    position,
  })
}

const progressLabel = computed(() => t('feedback.progressLinear.uploading', { percent: determinate.value }))
</script>

<template>
  <DemoPage :title="t('feedback.title')" :lead="t('feedback.lead')">
    <!-- ------------------------------------------------------------ spinner -->
    <DemoSection :title="t('feedback.spinner.title')" :note="t('feedback.spinner.note')">
      <JinSpinner size="sm" />
      <JinSpinner size="md" />
      <JinSpinner size="lg" />
      <JinDivider orientation="vertical" />
      <JinSpinner size="md" :label="t('feedback.spinner.label')" />
      <span class="gallery-muted">{{ t('feedback.spinner.muted') }}</span>
    </DemoSection>

    <!-- ----------------------------------------------------------- progress -->
    <DemoSection :title="t('feedback.progressLinear.title')" :note="t('feedback.progressLinear.note')">
      <div style="display: flex; flex-direction: column; gap: var(--jin-space-4); width: 100%">
        <JinProgress :value="determinate" :label="progressLabel" />
        <JinProgress :value="10" :label="t('feedback.progressLinear.small')" size="sm" />
        <JinProgress :value="60" :label="t('feedback.progressLinear.large')" size="lg" />
        <JinProgress :value="null" :label="t('feedback.progressLinear.indeterminate')" />
        <div style="display: flex; gap: var(--jin-space-2)">
          <JinButton size="sm" @click="bump(determinate - 10)">−10</JinButton>
          <JinButton size="sm" @click="bump(determinate + 10)">+10</JinButton>
          <JinButton size="sm" variant="ghost" @click="bump(0)">{{ t('common.reset') }}</JinButton>
        </div>
      </div>
    </DemoSection>

    <DemoSection :title="t('feedback.progressCircular.title')" :note="t('feedback.progressCircular.note')">
      <JinProgress variant="circular" :value="25" :diameter="40" />
      <JinProgress variant="circular" :value="70" :diameter="56" />
      <JinProgress variant="circular" :value="100" :diameter="72" />
      <JinProgress
        variant="circular"
        :value="null"
        :diameter="56"
        :label="t('feedback.progressCircular.working')"
        :show-value="false"
      />
    </DemoSection>

    <!-- ----------------------------------------------------------- skeleton -->
    <DemoSection :title="t('feedback.skeleton.title')" :note="t('feedback.skeleton.note')" stacked>
      <div style="display: grid; gap: var(--jin-space-5); grid-template-columns: repeat(auto-fit, minmax(240px, 1fr))">
        <div class="gallery-grid">
          <JinSkeleton variant="text" width="70%" />
          <JinSkeleton variant="text" width="100%" />
          <JinSkeleton variant="text" width="45%" />
          <JinSkeleton variant="rect" height="72px" />
        </div>
        <div style="display: flex; gap: var(--jin-space-3); align-items: center">
          <JinSkeleton variant="circle" width="48px" height="48px" />
          <div style="flex: 1 1 auto; display: grid; gap: var(--jin-space-2)">
            <JinSkeleton variant="text" width="60%" />
            <JinSkeleton variant="text" width="90%" />
          </div>
        </div>
        <div class="gallery-grid">
          <JinSkeleton variant="text" :animated="false" width="100%" />
          <JinSkeleton variant="rect" :animated="false" height="72px" />
          <span class="gallery-muted">{{ t('feedback.skeleton.static') }}</span>
        </div>
      </div>
    </DemoSection>

    <!-- -------------------------------------------------------------- alert -->
    <DemoSection :title="t('feedback.alert.title')" :note="t('feedback.alert.note')" stacked>
      <div class="gallery-grid">
        <JinAlert
          tone="info"
          :title="t('feedback.alert.infoTitle')"
          :description="t('feedback.alert.infoDescription')"
        />
        <JinAlert
          tone="success"
          :title="t('feedback.alert.successTitle')"
          :description="t('feedback.alert.successDescription')"
        />
        <JinAlert
          tone="warning"
          :title="t('feedback.alert.warningTitle')"
          :description="t('feedback.alert.warningDescription')"
        />
        <JinAlert
          tone="danger"
          :title="t('feedback.alert.dangerTitle')"
          :description="t('feedback.alert.dangerDescription')"
          dismissible
          @dismiss="toasts.push({ tone: 'neutral', title: t('feedback.alert.dismissed'), duration: 2000 })"
        />
        <JinAlert tone="neutral" :title="t('feedback.alert.neutralTitle')" />
        <JinAlert tone="info" :title="t('feedback.alert.actionsTitle')">
          <template #actions>
            <JinButton size="sm" variant="primary">{{ t('common.retry') }}</JinButton>
            <JinButton size="sm" variant="ghost">{{ t('common.dismiss') }}</JinButton>
          </template>
        </JinAlert>
        <JinAlert tone="warning" :title="longText" :description="t('feedback.alert.longDescription')" />
      </div>
    </DemoSection>

    <!-- -------------------------------------------------------------- toast -->
    <DemoSection :title="t('feedback.toast.title')" :note="t('feedback.toast.note')" stacked>
      <div style="display: flex; flex-wrap: wrap; gap: var(--jin-space-2)">
        <JinButton size="sm" @click="spawnToast('neutral')">{{ t('common.tone.neutral') }}</JinButton>
        <JinButton size="sm" @click="spawnToast('info')">{{ t('common.tone.info') }}</JinButton>
        <JinButton size="sm" @click="spawnToast('success')">{{ t('common.tone.success') }}</JinButton>
        <JinButton size="sm" @click="spawnToast('warning')">{{ t('common.tone.warning') }}</JinButton>
        <JinButton size="sm" @click="spawnToast('danger')">{{ t('feedback.toast.dangerButton') }}</JinButton>
        <JinButton size="sm" variant="secondary" @click="spawnStickyToast">
          {{ t('feedback.toast.stickyButton') }}
        </JinButton>
        <JinButton size="sm" variant="secondary" @click="spawnActionToast">
          {{ t('feedback.toast.actionButton') }}
        </JinButton>
      </div>

      <p class="gallery-section__note" style="margin: var(--jin-space-4) 0 0">
        {{ t('feedback.toast.positionsNote') }}
      </p>
      <div style="display: flex; flex-wrap: wrap; gap: var(--jin-space-2)">
        <JinButton v-for="position in positions" :key="position" size="sm" variant="ghost" @click="toastAt(position)">
          {{ position }}
        </JinButton>
      </div>
    </DemoSection>

    <!-- ------------------------------------------------------- notification -->
    <DemoSection :title="t('feedback.notification.title')" :note="t('feedback.notification.note')" stacked>
      <div style="display: flex; flex-wrap: wrap; gap: var(--jin-space-2)">
        <JinButton size="sm" @click="spawnNotification('plain')">
          {{ t('feedback.notification.plainButton') }}
        </JinButton>
        <JinButton size="sm" @click="spawnNotification('actions')">
          {{ t('feedback.notification.actionsButton') }}
        </JinButton>
        <JinButton size="sm" variant="danger" @click="spawnNotification('danger')">
          {{ t('feedback.notification.dangerButton') }}
        </JinButton>
        <JinButton size="sm" variant="ghost" @click="notifications.clear()">
          {{ t('feedback.notification.clearAll') }}
        </JinButton>
      </div>
      <JinAlert
        tone="info"
        :title="t('feedback.notification.compareTitle')"
        :description="t('feedback.notification.compareDescription')"
      />
    </DemoSection>

    <!-- ------------------------------------------------------------- result -->
    <DemoSection :title="t('feedback.result.title')" :note="t('feedback.result.note')" stacked>
      <StateGrid :columns="2">
        <div class="gallery-demo gallery-demo--stack gallery-demo--plain">
          <JinResult
            status="success"
            :title="t('feedback.result.importedTitle')"
            :description="t('feedback.result.importedDescription')"
          >
            <template #actions>
              <JinButton variant="primary" size="sm">{{ t('feedback.result.viewResults') }}</JinButton>
              <JinButton size="sm" variant="ghost">{{ t('feedback.result.importAnother') }}</JinButton>
            </template>
          </JinResult>
        </div>
        <div class="gallery-demo gallery-demo--stack gallery-demo--plain">
          <JinResult
            status="danger"
            :title="t('feedback.result.failedTitle')"
            :description="t('feedback.result.failedDescription')"
          >
            <template #actions>
              <JinButton variant="primary" size="sm">{{ t('feedback.result.downloadReport') }}</JinButton>
            </template>
          </JinResult>
        </div>
        <div class="gallery-demo gallery-demo--stack gallery-demo--plain">
          <JinResult status="empty" :description="t('feedback.result.emptyDescription')">
            <template #actions>
              <JinButton variant="primary" size="sm">{{ t('feedback.result.chooseFile') }}</JinButton>
            </template>
          </JinResult>
        </div>
        <div class="gallery-demo gallery-demo--stack gallery-demo--plain">
          <JinResult
            status="forbidden"
            :title="t('feedback.result.forbiddenTitle')"
            :description="t('feedback.result.forbiddenDescription')"
          />
        </div>
        <div class="gallery-demo gallery-demo--stack gallery-demo--plain">
          <JinResult
            status="notFound"
            :title="t('feedback.result.notFoundTitle')"
            :description="t('feedback.result.notFoundDescription')"
          />
        </div>
        <div class="gallery-demo gallery-demo--stack gallery-demo--plain">
          <JinResult
            status="offline"
            :title="t('feedback.result.offlineTitle')"
            :description="t('feedback.result.offlineDescription')"
          />
        </div>
      </StateGrid>
    </DemoSection>

    <DemoSection :title="t('feedback.loading.title')" :note="t('feedback.loading.note')" stacked>
      <div class="gallery-grid gallery-grid--two">
        <div class="gallery-demo gallery-demo--stack">
          <div style="display: flex; align-items: center; gap: var(--jin-space-2)">
            <JinSpinner size="sm" />
            <span>{{ t('feedback.loading.inline') }}</span>
          </div>
          <JinDivider />
          <div style="display: flex; align-items: center; gap: var(--jin-space-2)">
            <JinIcon name="clock" />
            <span class="gallery-muted">{{ t('feedback.loading.region') }}</span>
          </div>
          <JinDivider />
          <div style="display: flex; align-items: center; gap: var(--jin-space-2)">
            <JinSwitch
              :model-value="true"
              disabled
              size="sm"
              :label="t('feedback.loading.determinate')"
            />
          </div>
        </div>
        <div class="gallery-demo gallery-demo--stack">
          <p class="gallery-muted">{{ t('feedback.loading.rule') }}</p>
          <JinAlert
            tone="warning"
            :title="t('feedback.loading.neverFakeTitle')"
            :description="t('feedback.loading.neverFakeDescription')"
          />
        </div>
      </div>
    </DemoSection>
  </DemoPage>
</template>
