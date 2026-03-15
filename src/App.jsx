import { useEffect, useMemo, useRef, useState } from 'react'
import {
  GdsAlert,
  GdsButton,
  GdsDiv,
  GdsGrid,
  GdsSegment,
  GdsSegmentedControl,
  GdsText,
  IconCloudDownload,
  IconCloudUpload,
} from '@sebgroup/green-core/react'
import VariableTableSection from './components/VariableTableSection'
import initialData from './data/variable-table-data.json'

const sectionDefinitions = [
  {
    key: 'level-1',
    label: 'Level 1',
    dataKey: 'baseRows',
    headline: 'Level 1',
    summary:
      "A role used for the application's base or page background. This is the canvas on which all other elements are placed. It provides the foundation for visual hierarchy and contrast.",
  },
  {
    key: 'level-2',
    label: 'Level 2',
    dataKey: 'semanticRows',
    headline: 'Level 2',
    summary:
      'A role used for background layers like cards, alerts, and modals. Level 2 surfaces help group content and create structure on top of the main background. mappings that connect surfaces, borders and content tokens across versions.',
  },
  {
    key: 'level-3',
    label: 'Level 3',
    dataKey: 'componentRows',
    headline: 'Level 3',
    summary:
      'A role used for the background of interactive or foreground UI elements such as buttons, input fields, toggles, and chips. Container colors provide structure and emphasis within components. of component-scoped variables updated for 3.0 naming and behavior.',
  },
  {
    key: 'content',
    label: 'Content',
    dataKey: 'contentRows',
    headline: 'Content',
    summary: 'Content colours are used for text, icons, and other foreground elements. They guarantee readability and clear contrast against the background..',
  },
  {
    key: 'border',
    label: 'Border',
    dataKey: 'borderRows',
    headline: 'Border',
    summary: 'Border colours are used to define the edges of components and layout sections. They help separate content and add structure to the interface.',
  },
  {
    key: 'state',
    label: 'State',
    dataKey: 'stateRows',
    headline: 'State',
    summary: 'State colours provide visual feedback for interactions. We have defined an extensive set of tokens to support customisation across components. For example primary, secondary, and tertiary buttons.',
  },
]

const requiredDataKeys = sectionDefinitions.map((section) => section.dataKey)

const getSectionLevelValue = (section) => {
  if (!section) return ''
  const levelMatch = section.label.match(/^Level\s+(\d+)$/i)
  return levelMatch ? levelMatch[1] : section.label
}

const normalizeDataShape = (data) => {
  const normalized = { ...(data ?? {}) }

  requiredDataKeys.forEach((key) => {
    if (!Array.isArray(normalized[key])) {
      normalized[key] = []
    }
  })

  return normalized
}

function App() {
  const [tableData, setTableData] = useState(() => normalizeDataShape(initialData))
  const [activeSectionKey, setActiveSectionKey] = useState('level-1')
  const [importError, setImportError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [showProjectSaveAlert, setShowProjectSaveAlert] = useState(false)
  const [projectSaveAlertKey, setProjectSaveAlertKey] = useState(0)
  const fileInputRef = useRef(null)
  const syncPersistTimeoutRef = useRef(null)
  const tableDataRef = useRef(normalizeDataShape(initialData))

  useEffect(() => {
    tableDataRef.current = tableData
  }, [tableData])

  const activeSection = useMemo(
    () => sectionDefinitions.find((section) => section.key === activeSectionKey) ?? sectionDefinitions[0],
    [activeSectionKey],
  )

  const activeRows = useMemo(
    () =>
      (tableData[activeSection.dataKey] ?? []).map((row) => ({
        ...row,
        level: getSectionLevelValue(activeSection),
      })),
    [activeSection, tableData],
  )

  const saveJsonToDisk = (nextData) => {
    const blob = new Blob([JSON.stringify(nextData, null, 2)], {
      type: 'application/json;charset=utf-8',
    })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'variable-table-data.json'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const validateImportedData = (data) => {
    if (!data || typeof data !== 'object') return false
    if (!Array.isArray(data.baseRows)) return false
    if (!Array.isArray(data.semanticRows)) return false
    if (!Array.isArray(data.componentRows)) return false
    return true
  }

  const importJsonFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const content = await file.text()
      const parsed = JSON.parse(content)

      if (!validateImportedData(parsed)) {
        setImportError('Invalid JSON shape. Expected baseRows, semanticRows, and componentRows arrays.')
        return
      }

      setTableData(normalizeDataShape(parsed))
      setImportError('')
    } catch {
      setImportError('Could not import file. Please select a valid JSON file.')
    } finally {
      event.target.value = ''
    }
  }

  const persistTableData = async (nextData) => {
    try {
      const response = await fetch('/__save-table-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify(nextData),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok || result?.ok === false) {
        const endpointError = result?.error ? ` (${result.error})` : ''
        throw new Error(`Save endpoint failed${endpointError}`)
      }

      setTableData(nextData)
      setSaveError('')
      return true
    } catch (error) {
      setShowProjectSaveAlert(false)
      setSaveError(
        `Could not write to src/data/variable-table-data.json.${error instanceof Error ? ` ${error.message}.` : ''} If you are not running the app with Vite (dev/preview), use Download JSON as fallback.`,
      )
      return false
    }
  }

  const handleSaveToProjectJson = async () => {
    if (syncPersistTimeoutRef.current) {
      clearTimeout(syncPersistTimeoutRef.current)
      syncPersistTimeoutRef.current = null
    }

    const didSave = await persistTableData(tableDataRef.current)
    if (didSave) {
      setProjectSaveAlertKey((previous) => previous + 1)
      setShowProjectSaveAlert(true)
    }
  }

  const handleSaveRow = async (sectionKey, rowId, updatedRow) => {
    const section = sectionDefinitions.find((item) => item.key === sectionKey)
    const sectionName = section?.dataKey
    if (!sectionName) return false
    const sectionLevel = getSectionLevelValue(section)
    const currentData = tableDataRef.current

    if (syncPersistTimeoutRef.current) {
      clearTimeout(syncPersistTimeoutRef.current)
      syncPersistTimeoutRef.current = null
    }

    const nextData = {
      ...currentData,
      [sectionName]: currentData[sectionName].map((row) =>
        row.id === rowId ? { ...updatedRow, level: sectionLevel } : row,
      ),
    }

    return persistTableData(nextData)
  }

  const handleSyncRow = (sectionKey, rowId, syncedRow) => {
    const section = sectionDefinitions.find((item) => item.key === sectionKey)
    const sectionName = section?.dataKey
    if (!sectionName) return
    const sectionLevel = getSectionLevelValue(section)

    let nextDataSnapshot = null

    setTableData((previous) => {
      const nextData = {
        ...previous,
        [sectionName]: previous[sectionName].map((row) =>
          row.id === rowId ? { ...syncedRow, level: sectionLevel } : row,
        ),
      }

      nextDataSnapshot = nextData
      return nextData
    })

    if (syncPersistTimeoutRef.current) {
      clearTimeout(syncPersistTimeoutRef.current)
    }

    syncPersistTimeoutRef.current = setTimeout(() => {
      if (nextDataSnapshot) {
        persistTableData(nextDataSnapshot)
      }
    }, 450)
  }

  const handleAddRow = (sectionKey) => {
    const section = sectionDefinitions.find((item) => item.key === sectionKey)
    const sectionName = section?.dataKey
    if (!sectionName) return null

    const defaultLevel = getSectionLevelValue(section)

    const newRow = {
      id: `${sectionKey}-${Date.now()}`,
      level: defaultLevel,
      variableNameNow: '',
      variableName30: '',
      variableHexNow: '',
      variableHex30: '',
      commentBadge: {
        text: '',
        variant: 'information',
        iconName: 'info',
      },
      usedFor: '',
    }

    const nextData = {
      ...tableData,
      [sectionName]: [...tableData[sectionName], newRow],
    }

    setTableData(nextData)
    persistTableData(nextData)

    return newRow
  }

  const handleRemoveRow = async (sectionKey, rowIdOrRowIds) => {
    const section = sectionDefinitions.find((item) => item.key === sectionKey)
    const sectionName = section?.dataKey
    if (!sectionName) return false

    if (Array.isArray(rowIdOrRowIds)) {
      const idsToRemove = new Set(rowIdOrRowIds)
      const nextData = {
        ...tableData,
        [sectionName]: tableData[sectionName].filter((row) => !idsToRemove.has(row.id)),
      }
      return persistTableData(nextData)
    }

    const rowId = rowIdOrRowIds
    const nextData = {
      ...tableData,
      [sectionName]: tableData[sectionName].filter((row) => row.id !== rowId),
    }

    return persistTableData(nextData)
  }

  const handleMoveRow = async (sectionKey, rowId, direction) => {
    const section = sectionDefinitions.find((item) => item.key === sectionKey)
    const sectionName = section?.dataKey
    if (!sectionName) return false

    const currentRows = tableData[sectionName]
    const currentIndex = currentRows.findIndex((row) => row.id === rowId)
    if (currentIndex < 0) return false

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= currentRows.length) return false

    const nextRows = [...currentRows]
    const [movedRow] = nextRows.splice(currentIndex, 1)
    nextRows.splice(targetIndex, 0, movedRow)

    const nextData = {
      ...tableData,
      [sectionName]: nextRows,
    }

    return persistTableData(nextData)
  }

  return (
    <GdsDiv level="1" background="neutral-01" min-height="100vh">
      <GdsGrid
        columns="1"
        gap="5xl"
        width="100%"
        padding-inline="3xl"
        padding-block="3xl"
        box-sizing="border-box"
      >
        <GdsDiv display="grid" gap="s">
          <GdsDiv display="flex" justify-content="space-between" align-items="start" gap="m">
            <GdsDiv display="grid" gap="2xs">
              <GdsText tag="h1" font="display-l" margin="0">
                Variable mapping overview
              </GdsText>
              <GdsText margin="0" color="neutral-02" font="preamble-l">
                Updates, additions and deletions of variables for 3.0.
              </GdsText>
            </GdsDiv>

            <GdsDiv
              display="grid"
              gap="2xs"
              justify-items="end"
              style={{ marginTop: '16px', position: 'relative' }}
            >
              <GdsDiv display="flex" gap="s" flex-wrap="wrap" justify-content="end">
                <GdsButton rank="secondary" onClick={handleSaveToProjectJson}>
                  Save to project JSON
                </GdsButton>
                <GdsButton variant="brand" onClick={() => saveJsonToDisk(tableData)}>
                  <IconCloudDownload slot="lead" size="xl" label="Download" />
                  Download current JSON
                </GdsButton>
                <GdsButton variant="brand" onClick={() => fileInputRef.current?.click()}>
                  <IconCloudUpload slot="lead" size="xl" label="Import" />
                  Import JSON
                </GdsButton>
              </GdsDiv>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                style={{ display: 'none' }}
                onChange={importJsonFile}
              />
              {importError && (
                <GdsText margin="0" color="negative" font="detail-m">
                  {importError}
                </GdsText>
              )}
              {saveError && (
                <GdsText margin="0" color="negative" font="detail-m">
                  {saveError}
                </GdsText>
              )}
              {showProjectSaveAlert && !saveError && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 16px)',
                    right: 0,
                    width: '100%',
                    maxWidth: '460px',
                    zIndex: 20,
                  }}
                >
                    <GdsAlert
                      key={projectSaveAlertKey}
                      variant="positive"
                      role="status"
                      label="Project JSON save status"
                      timeout={3000}
                      onGdsClose={() => setShowProjectSaveAlert(false)}
                    >
                      Saved to src/data/variable-table-data.json
                    </GdsAlert>
                </div>
              )}
            </GdsDiv>
          </GdsDiv>
        </GdsDiv>

        <GdsDiv display="grid" gap="xl">
          <GdsSegmentedControl
            value={activeSectionKey}
            size="large"
            width="fit-content"
            align-self="start"
            onChange={(event) => {
              const nextValue = event?.target?.value
              if (typeof nextValue === 'string') {
                setActiveSectionKey(nextValue)
              }
            }}
          >
            {sectionDefinitions.map((section) => (
              <GdsSegment key={section.key} value={section.key} min-inline-size="108px">
                {section.label}
              </GdsSegment>
            ))}
          </GdsSegmentedControl>
          <VariableTableSection
            sectionKey={activeSection.key}
            headline={activeSection.headline}
            summary={activeSection.summary}
            rows={activeRows}
            onSaveRow={handleSaveRow}
            onSyncRow={handleSyncRow}
            onAddRow={handleAddRow}
            onRemoveRow={handleRemoveRow}
            onMoveRow={handleMoveRow}
          />
        </GdsDiv>
      </GdsGrid>
    </GdsDiv>
  )
}

export default App