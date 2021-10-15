import { DocumentIcon, DotsVerticalIcon, FilmIcon, FolderIcon } from '@heroicons/react/solid';
import clsx from 'clsx';
import React, { useCallback, useMemo, useState } from 'react';
import { IFile } from '../../types';
import byteSize from 'pretty-bytes';
import { useKey } from 'rooks';
import { invoke } from '@tauri-apps/api';
import { useExplorerStore } from '../../store/explorer';
import { DirectoryResponse } from '../../screens/Explorer';

interface Column {
  column: string;
  key: string;
  width: number;
}

// Function ensure no types are loss, but guarantees that they are Column[]
function ensureIsColumns<T extends Column[]>(data: T) {
  return data;
}

const columns = ensureIsColumns([
  { column: 'Name', key: 'name', width: 280 } as const,
  { column: 'Size', key: 'size_in_bytes', width: 120 } as const,
  { column: 'Checksum', key: 'meta_checksum', width: 120 } as const
  // { column: 'Tags', key: 'tags', width: 120 } as const
]);

type ColumnKey = typeof columns[number]['key'];

export const FileList: React.FC<{}> = (props) => {
  // const [selectedRow, setSelectedRow] = useState(0);
  const [currentDir, activeDirHash, collectDir, selectedRow, setSelectedRow] = useExplorerStore(
    (state) => [
      state.dirs[state.activeDirHash],
      state.activeDirHash,
      state.collectDir,
      state.selected,
      state.setSelected
    ]
  );

  useKey('ArrowUp', (e) => {
    e.preventDefault();
    if (selectedRow > 1) setSelectedRow(selectedRow - 1);
    else setSelectedRow(currentDir.children_count);
  });
  useKey('ArrowDown', (e) => {
    e.preventDefault();
    if (selectedRow < currentDir.children_count) setSelectedRow(selectedRow + 1);
    else setSelectedRow(0);
  });

  return useMemo(
    () => (
      <div className="table-container w-full h-full overflow-scroll bg-white dark:bg-gray-900 p-3 ">
        <div className="table-head">
          <div className="table-head-row flex flex-row p-2">
            {columns.map((col) => (
              <div
                key={col.key}
                className="table-head-cell flex flex-row items-center relative group px-4"
                style={{ width: col.width }}
              >
                <DotsVerticalIcon className="hidden absolute group-hover:block drag-handle w-5 h-5 opacity-10 -ml-5 cursor-move" />
                <span className="text-sm text-gray-500 font-medium">{col.column}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="table-body">
          {currentDir?.children?.map((row, index) => (
            <RenderRow key={row.id} row={row} rowIndex={index} />
          ))}
        </div>
      </div>
    ),
    [activeDirHash]
  );
};

const RenderRow: React.FC<{ row: IFile; rowIndex: number }> = ({ row, rowIndex }) => {
  const [collectDir, selectedRow, setSelectedRow] = useExplorerStore((state) => [
    state.collectDir,
    state.selected,
    state.setSelected
  ]);

  const isActive = selectedRow === row.id;
  const isAlternate = rowIndex % 2 == 0;

  return useMemo(
    () => (
      <div
        onClick={() => setSelectedRow(row.id as number)}
        onDoubleClick={() => {
          if (row.is_dir) {
            invoke<DirectoryResponse>('get_files', { path: row.uri }).then((res) => {
              collectDir(res.directory, res.contents);
            });
          }
        }}
        className={clsx('table-body-row flex flex-row rounded-lg border-2 border-[#00000000]', {
          'bg-[#00000006] dark:bg-[#00000030]': isAlternate,
          'border-primary-500': isActive
        })}
      >
        {columns.map((col) => (
          <div key={col.key} className="table-body-cell px-4 py-2" style={{ width: col.width }}>
            <RenderCell row={row} colKey={col?.key} />
          </div>
        ))}
      </div>
    ),
    [isActive]
  );
};

const RenderCell: React.FC<{ colKey?: ColumnKey; row?: IFile }> = ({ colKey, row }) => {
  if (!row || !colKey || !row[colKey]) return <></>;
  const value = row[colKey];

  switch (colKey) {
    case 'name':
      return (
        <div className="flex flex-row items-center">
          {colKey == 'name' &&
            (() => {
              switch (row.extension.toLowerCase()) {
                case 'mov' || 'mp4':
                  return <FilmIcon className="w-5 h-5 mr-3 flex-shrink-0" />;

                default:
                  if (row.is_dir) return <FolderIcon className="w-5 h-5 mr-3 flex-shrink-0" />;
                  return <DocumentIcon className="w-5 h-5 mr-3 flex-shrink-0" />;
              }
            })()}
          <span className="truncate">{row[colKey]}</span>
        </div>
      );
    case 'size_in_bytes':
      return <span>{byteSize(Number(value || 0))}</span>;
    case 'meta_checksum':
      return <span className="truncate">{value}</span>;
    // case 'tags':
    //   return renderCellWithIcon(MusicNoteIcon);

    default:
      return <></>;
  }
};