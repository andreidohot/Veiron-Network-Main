use crate::error::{IndexerError, IndexerResult};
use crate::index::IndexData;
use atomic_write_file::AtomicWriteFile;
use std::fs::{self, File};
use std::io::{BufReader, Write};
use std::path::{Path, PathBuf};

pub const INDEX_FILE_NAME: &str = "index.json";

pub fn index_file_path(index_dir: &Path) -> PathBuf {
    index_dir.join(INDEX_FILE_NAME)
}

pub fn ensure_index_dir(index_dir: &Path) -> IndexerResult<()> {
    fs::create_dir_all(index_dir)?;
    Ok(())
}

/// Atomic write + fsync so a crash mid-write cannot leave a truncated index (A-H03).
pub fn write_index(index_dir: &Path, index: &IndexData) -> IndexerResult<()> {
    ensure_index_dir(index_dir)?;
    let path = index_file_path(index_dir);
    let mut file = AtomicWriteFile::open(&path)?;
    let payload = serde_json::to_vec_pretty(index)?;
    file.write_all(&payload)?;
    file.sync_all()?;
    file.commit()?;
    Ok(())
}

pub fn load_index(index_dir: &Path) -> IndexerResult<IndexData> {
    let path = index_file_path(index_dir);
    if !path.exists() {
        return Err(IndexerError::IndexNotInitialized(path));
    }

    let file = File::open(&path)?;
    let reader = BufReader::new(file);
    serde_json::from_reader(reader).map_err(|error| IndexerError::InvalidIndexFile {
        path,
        message: error.to_string(),
    })
}

pub fn reset_index_dir(index_dir: &Path) -> IndexerResult<()> {
    if index_dir.exists() {
        fs::remove_dir_all(index_dir)?;
    }
    fs::create_dir_all(index_dir)?;
    Ok(())
}
