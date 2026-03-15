import { GdsButton, GdsDiv, GdsText, IconBrandGreen, IconArrowInbox, IconCloudDownload, IconCloudUpload } from '@sebgroup/green-core/react'

export default function AppHeader({
  onSaveToProjectJson,
  onDownloadJson,
  onImportJson,
  onFileChange,
  fileInputRef,
}) {
  return (
    <GdsDiv display="flex" justify-content="space-between" align-items="center" gap="m">
      <GdsDiv display="flex" align-items="center" gap="m">
        <GdsDiv
          display="inline-flex"
          align-items="center"
          justify-content="center"
          width="56px"
          height="56px"
          border-radius="s"
          background="brand-01"
          level="3"
          color="inversed"
        >
          <IconBrandGreen size="2xl" label="Green icon" />
        </GdsDiv>
        <GdsDiv display="grid" gap="4xs">
          <GdsText font="heading-s" margin="0">
            GDS tokens 3.0
          </GdsText>
          <GdsText margin="0" color="neutral-02" font="heading-s">
            Updates, additions and deletions
          </GdsText>
        </GdsDiv>
      </GdsDiv>

      <GdsDiv display="flex" gap="s" flex-wrap="wrap" justify-content="end">
        <GdsButton variant="neutral" rank="secondary" onClick={onDownloadJson}>
          <IconCloudDownload slot="lead" size="xl" label="Download" />
          Download current JSON
        </GdsButton>
        <GdsButton variant="neutral" rank="secondary" onClick={onImportJson}>
          <IconCloudUpload slot="lead" size="xl" label="Import" />
          Import JSON
        </GdsButton>
        <GdsButton variant="brand" rank="primary" onClick={onSaveToProjectJson}>
          <IconArrowInbox slot="lead" size="xl" label="Save" />
          Save to project JSON
        </GdsButton>
      </GdsDiv>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        style={{ display: 'none' }}
        onChange={onFileChange}
      />
    </GdsDiv>
  )
}
