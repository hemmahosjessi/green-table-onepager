import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import {
  GdsBadge,
  GdsButton,
  GdsDiv,
  GdsInput,
  GdsTable,
  GdsText,
  GdsTextarea,
  IconArrowDown,
  IconArrowUp,
  IconCircleCheck,
  IconCircleInfo,
  IconCirclePlus,
  IconCircleX,
  IconTriangleExclamation,
} from '@sebgroup/green-core/react'
import { Slot } from '@sebgroup/green-core/components/table/table.types.js'

const baseColumns = [
  { key: 'level', label: 'Level', sortable: false, width: '52px', align: 'start' },
  { key: 'variableNameNow', label: 'Name now', sortable: false, width: '140px', align: 'start' },
  { key: 'variableName30', label: 'Name 3.0', sortable: false, width: '140px', align: 'start' },
  { key: 'variableHexNow', label: 'Hex now', sortable: false, width: '135px', align: 'start' },
  { key: 'variableHex30', label: 'Hex 3.0', sortable: false, width: '135px', align: 'start' },
  { key: 'comment', label: 'Status', sortable: false, width: '150px', align: 'start' },
  { key: 'usedFor', label: 'Used for', sortable: false, width: '300px', align: 'start' },
  { key: 'actions', label: 'Actions', sortable: false, width: '180px', justify: 'end', align: 'start' },
]

const iconMap = {
  info: IconCircleInfo,
  success: IconCircleCheck,
  warning: IconTriangleExclamation,
}

const badgeIconByVariant = {
  information: IconCircleInfo,
  notice: IconCircleInfo,
  positive: IconCircleCheck,
  warning: IconTriangleExclamation,
  negative: IconTriangleExclamation,
}

const removeModeSpacerColumn = {
  key: 'removeModeSpacer',
  label: '',
  sortable: false,
  width: '32px',
}

function VariableTableSection({
  sectionKey,
  headline,
  summary,
  rows,
  onSaveRow,
  onAddRow,
  onRemoveRow,
  onMoveRow,
  onSyncRow,
}) {
  const tableContainerRef = useRef(null)
  const tableRef = useRef(null)
  const stickyBarRef = useRef(null)
  const firstEditableInputRef = useRef(null)
  const [tableEditMode, setTableEditMode] = useState(false)
  const [selectedRowIds, setSelectedRowIds] = useState([])
  const [editingRowId, setEditingRowId] = useState(null)
  const [draftRow, setDraftRow] = useState(null)
  const [originalRow, setOriginalRow] = useState(null)
  const [newRowId, setNewRowId] = useState(null)
  const [rowSaveError, setRowSaveError] = useState('')
  const [rowRemoveError, setRowRemoveError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [isStickyOverlapping, setIsStickyOverlapping] = useState(false)

  const allRowIds = useMemo(() => rows.map((row) => row.id), [rows])
  const hasSelectedRows = selectedRowIds.length > 0
  const totalRows = rows.length

  useEffect(() => {
    const validIds = new Set(allRowIds)
    setSelectedRowIds((previous) => previous.filter((id) => validIds.has(id)))
  }, [allRowIds])

  useEffect(() => {
    const updateStickyOverlap = () => {
      const stickyBarElement = stickyBarRef.current
      const tableContainerElement = tableContainerRef.current

      if (!stickyBarElement || !tableContainerElement) {
        setIsStickyOverlapping(false)
        return
      }

      const stickyBarRect = stickyBarElement.getBoundingClientRect()
      const tableContainerRect = tableContainerElement.getBoundingClientRect()

      setIsStickyOverlapping(stickyBarRect.top < tableContainerRect.bottom)
    }

    const frameId = requestAnimationFrame(updateStickyOverlap)
    window.addEventListener('scroll', updateStickyOverlap, { passive: true })
    window.addEventListener('resize', updateStickyOverlap)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('scroll', updateStickyOverlap)
      window.removeEventListener('resize', updateStickyOverlap)
    }
  }, [rows.length, tableEditMode, selectedRowIds.length])

  useEffect(() => {
    if (!editingRowId || !newRowId || editingRowId !== newRowId) return

    requestAnimationFrame(() => {
      firstEditableInputRef.current?.focus?.()
    })
  }, [editingRowId, newRowId])

  const columns = useMemo(
    () =>
      tableEditMode
        ? [
            removeModeSpacerColumn,
            ...baseColumns
              .filter((column) => column.key !== 'level')
              .map(({ align, ...column }) => column),
          ]
        : baseColumns,
    [tableEditMode],
  )

  const startEditRow = (row) => {
    if (tableEditMode) return
    setRowSaveError('')
    setEditingRowId(row.id)
    setOriginalRow(row)
    setDraftRow({
      ...row,
      commentBadge: {
        text: row.commentBadge?.text ?? '',
        variant: row.commentBadge?.variant ?? 'information',
        iconName: row.commentBadge?.iconName ?? 'info',
      },
    })
  }

  const getFieldValueFromEvent = (event) =>
    event?.detail?.value ?? event?.target?.value ?? event?.currentTarget?.value ?? ''

  const updateDraftField = (field, value) => {
    setDraftRow((previous) => {
      if (!previous) return previous
      const nextDraft = { ...previous, [field]: value }
      if (editingRowId) {
        onSyncRow?.(sectionKey, editingRowId, nextDraft)
      }
      return nextDraft
    })
  }

  const updateDraftBadgeField = (field, value) => {
    setDraftRow((previous) => {
      if (!previous) return previous
      const nextDraft = {
        ...previous,
        commentBadge: {
          ...(previous?.commentBadge ?? {}),
          [field]: value,
        },
      }
      if (editingRowId) {
        onSyncRow?.(sectionKey, editingRowId, nextDraft)
      }
      return nextDraft
    })
  }

  const handleDraftFieldEvent = (field, event) => {
    updateDraftField(field, getFieldValueFromEvent(event))
  }

  const handleDraftBadgeFieldEvent = (field, event) => {
    updateDraftBadgeField(field, getFieldValueFromEvent(event))
  }

  const cancelEditRow = () => {
    if (isSaving) return
    setRowSaveError('')
    if (editingRowId && editingRowId === newRowId) {
      onRemoveRow?.(sectionKey, editingRowId)
    } else if (editingRowId && originalRow) {
      onSyncRow?.(sectionKey, editingRowId, originalRow)
    }
    setEditingRowId(null)
    setDraftRow(null)
    setOriginalRow(null)
    setNewRowId(null)
  }

  const saveEditRow = async () => {
    if (!editingRowId || !draftRow || isSaving) return
    setIsSaving(true)
    const didSave = await onSaveRow?.(sectionKey, editingRowId, draftRow)
    if (!didSave) {
      setRowSaveError('Save failed. Please try again.')
      setIsSaving(false)
      return
    }

    setRowSaveError('')
    setEditingRowId(null)
    setDraftRow(null)
    setOriginalRow(null)
    setNewRowId(null)
    setIsSaving(false)
  }

  const handleAddRowClick = () => {
    if (isSaving || isRemoving || tableEditMode) return
    const row = onAddRow?.(sectionKey)
    if (!row) return
    setNewRowId(row.id)
    startEditRow(row)

    requestAnimationFrame(() => {
      const containerElement = tableContainerRef.current
      if (containerElement) {
        containerElement.scrollTo({ top: containerElement.scrollHeight, behavior: 'smooth' })
      }

      const tableElement = tableRef.current
      const tableDataElement = tableElement?.shadowRoot?.querySelector?.('.data')
      if (tableDataElement) {
        tableDataElement.scrollTo({ top: tableDataElement.scrollHeight, behavior: 'smooth' })
      }
    })
  }

  const toggleTableEditMode = () => {
    if (isSaving || isRemoving) return

    if (editingRowId) {
      cancelEditRow()
    }

    setTableEditMode((previous) => !previous)
    setSelectedRowIds([])
    setRowRemoveError('')
  }

  const handleRemoveSelectedRows = async () => {
    if (!selectedRowIds.length || isRemoving || isSaving) return
    setIsRemoving(true)
    setRowRemoveError('')

    const didRemoveRows = await onRemoveRow?.(sectionKey, selectedRowIds)

    if (!didRemoveRows) {
      setRowRemoveError('Could not remove selected rows. Please try again.')
      setIsRemoving(false)
      return
    }

    setSelectedRowIds([])
    setRowRemoveError('')
    setTableEditMode(false)
    setIsRemoving(false)
  }

  const handleMoveRow = async (rowId, direction) => {
    const didMove = await onMoveRow?.(sectionKey, rowId, direction)
    if (!didMove) {
      setRowSaveError('Could not move row. Please try again.')
      return
    }
    setRowSaveError('')
  }

  const preparedRows = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        ...(tableEditMode ? { removeModeSpacer: Slot('', ['main'], row.id) } : {}),
        comment: Slot('', ['main'], row.id),
        actions: Slot('', ['main'], row.id),
        ...(row.id === editingRowId
          ? {
              level: Slot('', ['main'], row.id),
              variableNameNow: Slot('', ['main'], row.id),
              variableName30: Slot('', ['main'], row.id),
              variableHexNow: Slot('', ['main'], row.id),
              variableHex30: Slot('', ['main'], row.id),
              usedFor: Slot('', ['main'], row.id),
            }
          : {}),
      })),
    [rows, editingRowId, tableEditMode],
  )

    const dataProvider = useMemo(
      () => async () => ({ rows: preparedRows, total: preparedRows.length }),
      [preparedRows],
    )

  return (
    <GdsDiv
      display="grid"
      gap="m"
      width="100%"
      box-sizing="border-box"
    >
      <GdsDiv
        display="flex"
        justify-content="space-between"
        align-items="end"
        gap="m"
      >
        <GdsDiv display="grid" gap="2xs" style={{ maxWidth: '85ch' }}>
          <GdsText tag="h2" margin="0">
            {headline}
          </GdsText>
          <GdsText margin="0" color="neutral-02" font="preamble-s">
            {summary}
          </GdsText>
        </GdsDiv>
        <GdsDiv margin-inline-end="xs">
          <GdsButton rank="secondary" style={{ inlineSize: '132px' }} onClick={toggleTableEditMode}>
            {tableEditMode ? 'Cancel' : 'Remove row'}
          </GdsButton>
        </GdsDiv>
      </GdsDiv>

      <GdsDiv
        ref={tableContainerRef}
        width="100%"
        overflow="auto"
        box-sizing="border-box"
      >
        <GdsTable
          ref={tableRef}
          page={1}
          rows={preparedRows.length}
          columns={columns}
          data={dataProvider}
          selectable={tableEditMode}
          density="spacious"
          style={{
            '--table-cell-padding-y': '14px',
          }}
          responsive
          nocache
          variant="secondary"
          dataLoadKey={sectionKey}
          onGdsTableSelection={(event) => {
            const selectedData = event?.detail?.selectedData ?? []
            const nextSelectedIds = selectedData
              .map((item) => item?.id)
              .filter((id) => typeof id === 'string')
            setSelectedRowIds(nextSelectedIds)
          }}
        >
          {preparedRows.map((row, index) => {
            const isRowEditing = row.id === editingRowId
            const activeRow = isRowEditing ? draftRow : row
            const canMoveUp = index > 0
            const canMoveDown = index < preparedRows.length - 1

            return (
              <Fragment key={row.id}>
              {isRowEditing && activeRow && (
                <>
                  <GdsDiv slot={`level:${row.id}:main`}>
                    <GdsInput
                      plain
                      size="small"
                      disabled
                      label={`level-${row.id}`}
                      value={activeRow.level ?? ''}
                      onInput={(event) => handleDraftFieldEvent('level', event)}
                      onChange={(event) => handleDraftFieldEvent('level', event)}
                    />
                  </GdsDiv>
                  <GdsDiv slot={`variableNameNow:${row.id}:main`}>
                    <GdsInput
                      ref={row.id === newRowId ? firstEditableInputRef : undefined}
                      plain
                      size="small"
                      label={`variable-name-now-${row.id}`}
                      value={activeRow.variableNameNow ?? ''}
                      onInput={(event) => handleDraftFieldEvent('variableNameNow', event)}
                      onChange={(event) => handleDraftFieldEvent('variableNameNow', event)}
                    />
                  </GdsDiv>
                  <GdsDiv slot={`variableName30:${row.id}:main`}>
                    <GdsInput
                      plain
                      size="small"
                      label={`variable-name-30-${row.id}`}
                      value={activeRow.variableName30 ?? ''}
                      onInput={(event) => handleDraftFieldEvent('variableName30', event)}
                      onChange={(event) => handleDraftFieldEvent('variableName30', event)}
                    />
                  </GdsDiv>
                  <GdsDiv slot={`variableHexNow:${row.id}:main`}>
                    <GdsInput
                      plain
                      size="small"
                      label={`variable-hex-now-${row.id}`}
                      value={activeRow.variableHexNow ?? ''}
                      onInput={(event) => handleDraftFieldEvent('variableHexNow', event)}
                      onChange={(event) => handleDraftFieldEvent('variableHexNow', event)}
                    />
                  </GdsDiv>
                  <GdsDiv slot={`variableHex30:${row.id}:main`}>
                    <GdsInput
                      plain
                      size="small"
                      label={`variable-hex-30-${row.id}`}
                      value={activeRow.variableHex30 ?? ''}
                      onInput={(event) => handleDraftFieldEvent('variableHex30', event)}
                      onChange={(event) => handleDraftFieldEvent('variableHex30', event)}
                    />
                  </GdsDiv>
                  <GdsDiv slot={`usedFor:${row.id}:main`} width="100%">
                    <GdsTextarea
                      plain
                      size="small"
                      width="100%"
                      rows={2}
                      resizable="auto"
                      label={`used-for-${row.id}`}
                      value={activeRow.usedFor ?? ''}
                      onInput={(event) => handleDraftFieldEvent('usedFor', event)}
                      onChange={(event) => handleDraftFieldEvent('usedFor', event)}
                    />
                  </GdsDiv>
                </>
              )}

              <GdsDiv
                slot={`comment:${row.id}:main`}
                display="flex"
                gap="3xs"
                flex-wrap="wrap"
                align-items="start"
              >
                {isRowEditing && activeRow ? (
                  <GdsDiv display="grid" gap="3xs" width="100%">
                    <GdsInput
                      plain
                      size="small"
                      label={`comment-text-${row.id}`}
                      value={activeRow.commentBadge?.text ?? ''}
                      onInput={(event) => handleDraftBadgeFieldEvent('text', event)}
                      onChange={(event) => handleDraftBadgeFieldEvent('text', event)}
                    />
                    <GdsInput
                      plain
                      size="small"
                      label={`comment-variant-${row.id}`}
                      value={activeRow.commentBadge?.variant ?? 'information'}
                      onInput={(event) => handleDraftBadgeFieldEvent('variant', event)}
                      onChange={(event) => handleDraftBadgeFieldEvent('variant', event)}
                    />
                    <GdsInput
                      plain
                      size="small"
                      label={`comment-icon-${row.id}`}
                      value={activeRow.commentBadge?.iconName ?? 'info'}
                      onInput={(event) => handleDraftBadgeFieldEvent('iconName', event)}
                      onChange={(event) => handleDraftBadgeFieldEvent('iconName', event)}
                    />
                  </GdsDiv>
                ) : (
                  (() => {
                    const badgeVariant = row.commentBadge?.variant || 'information'
                    const BadgeIcon =
                      iconMap[row.commentBadge?.iconName] || badgeIconByVariant[badgeVariant]

                    return (
                      <GdsBadge key={`${row.id}-comment`} size="small" variant={badgeVariant}>
                        {BadgeIcon && (
                          <BadgeIcon slot="lead" size="s" label={`${badgeVariant} badge icon`} />
                        )}
                        {row.commentBadge?.text}
                      </GdsBadge>
                    )
                  })()
                )}
              </GdsDiv>

              <GdsDiv
                slot={`actions:${row.id}:main`}
                display="grid"
                gap="3xs"
                justify-items="end"
                width="100%"
              >
                {tableEditMode ? null : isRowEditing ? (
                  <GdsDiv display="grid" gap="3xs" justify-items="end" width="100%">
                    <GdsDiv display="flex" gap="3xs" flex-wrap="nowrap" justify-content="end">
                      <GdsButton
                        size="small"
                        rank="secondary"
                        label="Move row up"
                        style={{ borderRadius: '999px' }}
                        disabled={!canMoveUp || isSaving}
                        onClick={() => handleMoveRow(row.id, 'up')}
                      >
                        <IconArrowUp size="m" label="Move row up" />
                      </GdsButton>
                      <GdsButton
                        size="small"
                        rank="secondary"
                        label="Move row down"
                        style={{ borderRadius: '999px' }}
                        disabled={!canMoveDown || isSaving}
                        onClick={() => handleMoveRow(row.id, 'down')}
                      >
                        <IconArrowDown size="m" label="Move row down" />
                      </GdsButton>
                      <GdsButton size="small" rank="tertiary" onClick={cancelEditRow}>
                        Cancel
                      </GdsButton>
                      <GdsButton size="small" disabled={isSaving} onClick={saveEditRow}>
                        {isSaving ? 'Saving...' : 'Save'}
                      </GdsButton>
                    </GdsDiv>
                    {rowSaveError && (
                      <GdsText margin="0" color="negative" font="detail-s">
                        {rowSaveError}
                      </GdsText>
                    )}
                  </GdsDiv>
                ) : (
                  <GdsButton size="small" rank="secondary" onClick={() => startEditRow(row)}>
                    Edit
                  </GdsButton>
                )}
              </GdsDiv>
              </Fragment>
            )
          })}
        </GdsTable>
      </GdsDiv>

      <GdsDiv
        ref={stickyBarRef}
        display="grid"
        gap="3xs"
        style={{
          borderRadius: '999px',
          marginInline: '-8px',
          width: 'calc(100% + 16px)',
          position: 'sticky',
          bottom: '32px',
          zIndex: 2,
          border: isStickyOverlapping
            ? '1px solid var(--gds-sys-color-border-subtle-02)'
            : '1px solid transparent',
          backgroundColor: 'rgba(255, 255, 255, 0.92)',
        }}
        box-sizing="border-box"
        padding="xs"
      >
        <GdsDiv display="flex" justify-content="space-between" align-items="center" gap="s">
          <GdsDiv display="flex" justify-content="start" align-items="center" gap="xs">
            {!tableEditMode && (
              <GdsDiv style={{ marginLeft: '24px' }}>
                <GdsText font="detail-book-m" color="neutral-02">
                  Total rows: {totalRows}
                </GdsText>
              </GdsDiv>
            )}
            {hasSelectedRows && (
              <GdsButton
                variant="negative"
                min-inline-size="132px"
                disabled={isRemoving || isSaving}
                onClick={handleRemoveSelectedRows}
              >
                <IconCircleX slot="lead" size="xl" label="Remove rows" />
                {isRemoving
                  ? 'Removing...'
                  : `Remove ${selectedRowIds.length} row${selectedRowIds.length === 1 ? '' : 's'}`}
              </GdsButton>
            )}
          </GdsDiv>

          <GdsDiv display="flex" justify-content="end" align-items="center">
            <GdsButton
              rank="secondary"
              min-inline-size="132px"
              disabled={tableEditMode}
              onClick={handleAddRowClick}
            >
              <IconCirclePlus slot="lead" size="xl" label="Add row" />
              Add row
            </GdsButton>
          </GdsDiv>
        </GdsDiv>

        {rowRemoveError && (
          <GdsText margin="0" color="negative" font="detail-s">
            {rowRemoveError}
          </GdsText>
        )}
      </GdsDiv>
    </GdsDiv>
  )
}

export default VariableTableSection
