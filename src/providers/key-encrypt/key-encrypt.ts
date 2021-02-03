import { Injectable } from '@angular/core';
import { File } from '@ionic-native/file';
import BWC from 'bitcore-wallet-client';
import { Platform } from 'ionic-angular';
import { Logger } from '../logger/logger';
import { FileStorage } from '../persistence/storage/file-storage';
import { LocalStorage } from '../persistence/storage/local-storage';

@Injectable()
export class KeyEncryptProvider {
  // new key at the end
  private STORAGE_ENCRYPTING_KEYS = [
    'asdfghjklpoiuytrewqazxcvbnjskawq',
    'poiqwerlkhjkasdfgiuwerhjabsdfgks',
    'agksdfkjg234587asdjkhfdsakhjg283'
  ];

  constructor(
    private logger: Logger,
    private platform: Platform,
    private file: File
  ) {
    logger.info(`KeyEncryptProvider Constructor ${new Date().toString()}`);
  }

  init() {
    return new Promise<void>(resolve => {
      // if(1) return resolve();
      setTimeout(async () => {
        this.logger.debug('#### Running key encrypt provider init function');
        const storage = this.platform.is('cordova')
          ? new FileStorage(this.file, this.logger)
          : new LocalStorage(this.logger);

        const keys = await storage.get('keys'); // get key
        if (!keys) {
          this.logger.debug('#### KeyEncryptProvider - no keys');
          return resolve();
        }
        let decryptedKeys = this.tryDescryptKeys(JSON.stringify(keys));
        const storageEncryptingKey = this.STORAGE_ENCRYPTING_KEYS[
          this.STORAGE_ENCRYPTING_KEYS.length - 1
        ]; // new encrypt key
        const encryptedKeys = BWC.sjcl.encrypt(
          storageEncryptingKey,
          decryptedKeys
        );
        this.logger.debug(
          `#### Storage encrypted with key number: ${
            this.STORAGE_ENCRYPTING_KEYS.length - 1
          }`
        );
        await storage.set('keys', JSON.parse(encryptedKeys));
        return resolve();
      }, 500);
    });
  }

  private tryDescryptKeys(keys: string) {
    let decryptedKeys;
    this.STORAGE_ENCRYPTING_KEYS.every((value, index) => {
      try {
        decryptedKeys = BWC.sjcl.decrypt(value, keys);
        this.logger.debug(`#### Storage decrypted with key number: ${index}`);
        return false; // break;
      } catch (err) {
        if (this.STORAGE_ENCRYPTING_KEYS.length - 1 === index) {
          // Failed on the last iteration
          if (err && err.message == "json decode: this isn't json!") {
            this.logger.debug(`#### Not yet encrypted. No Problem.`);
          }
          if (err && err.message == "ccm: tag doesn't match") {
            this.logger.debug(
              `#### Could not decrypt storage. Tested ${this.STORAGE_ENCRYPTING_KEYS.length} keys without success`
            );
            // message to the user: this version is not compatible with your storage, please uppdate to the most recent version or contact support
          }
        }
        return true; // continue;
      }
    });
    return decryptedKeys || keys;
  }

  public encryptKeys(keys): string {
    const encryptingKey = this.STORAGE_ENCRYPTING_KEYS[
      this.STORAGE_ENCRYPTING_KEYS.length - 1
    ];
    let encryptedKeys;
    try {
      encryptedKeys = BWC.sjcl.encrypt(encryptingKey, JSON.stringify(keys));
    } catch (error) {
      // something ?
    }
    return encryptedKeys;
  }

  public decryptKeys(encryptedKeys): string {
    const encryptingKey = this.STORAGE_ENCRYPTING_KEYS[
      this.STORAGE_ENCRYPTING_KEYS.length - 1
    ];
    let keys;
    try {
      keys = BWC.sjcl.decrypt(encryptingKey, JSON.stringify(encryptedKeys));
    } catch (error) {
      // something ?
    }
    this.logger.debug(
      `Storage decrypted successfully with key number: ${
        this.STORAGE_ENCRYPTING_KEYS.length - 1
      }`
    );
    return keys;
  }
}
