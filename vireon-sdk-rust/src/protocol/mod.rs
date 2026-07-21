//! Self-contained protocol primitives for the SDK (no `veiron-core` dependency).
//!
//! Kept in sync with monorepo `veiron-core` for wire compatibility. Crates.io
//! consumers only need `veiron-sdk-rust`.

pub mod address;
pub mod amount;
pub mod constants;
pub mod crypto;
pub mod errors;
pub mod network;
pub mod seed;
pub mod signing;
pub mod standards;
pub mod transaction;

pub use address::Address;
pub use amount::Amount;
pub use constants::*;
pub use crypto::{blake3_hash, hash_to_hex, Hash};
pub use errors::{Result as ProtocolResult, VeironError};
pub use network::Network;
pub use seed::{generate_mnemonic, MnemonicWordCount, WalletDerivationPath};
pub use signing::{PrivateKey, PublicKey, Signature};
pub use transaction::{Transaction, UnsignedTransaction};
