'use strict'
const reload = require('require-reload')(require);
const Setting = reload('./setting.js')
const assert = require('assert');

function throwError(baseString, failedBlob) {
  throw new Error(baseString + ' Failed blob: \n' + JSON.stringify(failedBlob, null, 2));
}

class SettingsCategory {
  constructor(settingsBlob, qualificationWithoutName, categoryIdentifier, settingIdentifier, config) {
    this.name_ = settingsBlob.name || '';
    this.config_ = config;
    this.settingIdentifier_ = settingIdentifier;
    this.settingsCategorySeparator_ = config.settingsCategorySeparator;
    this.fullyQualifiedName_ = qualificationWithoutName ? qualificationWithoutName + this.settingsCategorySeparator_ + this.name_ : this.name_;
    this.isTopLevel_ = !this.fullyQualifiedName_;
    this.categoryIdentifier_ = categoryIdentifier;
    this.children_ = [];
    this.type = categoryIdentifier;
  }

  static createRootCategory(categoryIdentifier, settingIdentifier, config) {
    let settingsBlob = {
      name: '',
    };
    return new SettingsCategory(settingsBlob, '', categoryIdentifier, settingIdentifier, config);
  }

  setChildren(children) {
    if (!children || children.length === 0) {
      return;
    }
    this.childrenType_ = children[0].type;
    if (!children.every(child => child.type === this.childrenType_)) {
      throwError(`A settings category has children of different type. They should all either be '${this.categoryIdentifier_}'' or '${this.settingIdentifier_}'. They cannot be mixed.`, children);
    }
    this.children_ = [];
    for (let child of children) {
      if (!child) {
        throwError('A child is invalid.', children);
      }
      if (!child.type || typeof child.type !== typeof '' || (child.type !== this.categoryIdentifier_ && child.type !== this.settingIdentifier_)) {
        throwError(`A child has an invalid type. It should be a string, either '${this.categoryIdentifier_}'' or '${this.settingIdentifier_}'.`, children);
      }
      if (this.children_.find(otherChild => otherChild.name === child.name)) {
        throwError('Two children have the same name.', cildren);
      }
      if (child.type === this.categoryIdentifier_) {
        let childCategory = new SettingsCategory(child, this.fullyQualifiedName_, this.categoryIdentifier_, this.settingIdentifier_, this.config_)
        this.children_.push(childCategory);
        childCategory.setChildren(child.children);
      } else {
        this.children_.push(new Setting(child, this.fullyQualifiedName_, this.settingsCategorySeparator_));
      }
    }
  }

  setNewValueFromUserFacingString(bot, msg, currentSettings, newValue, serverWide) {
    // This is a category, not a setting. Return the category information to print.
    return getConfigurationInstructionsString(bot, msg, currentSettings, this.fullyQualifiedName_);
  }

  getChildForRelativeQualifiedName(relativeQualifiedName) {
    let child = this.getChildForRelativeQualifiedNameHelper_(relativeQualifiedName);
    if (child) {
      debugger;
      return child.getChildForRelativeQualifiedName(this.getRelativeQualifiedNameForChild_(relativeQualifiedName));
    } else {
      return this;
    }
  }

  getConfigurationInstructionsString(bot, msg, settings, desiredFullyQualifiedName) {
    let prefix = '';
    if (desiredFullyQualifiedName !== this.fullyQualifiedName_) {
      prefix = 'I didn\'t find settings for ' + desiredFullyQualifiedName + '. Here are the settings for ' + this.fullyQualifiedName_ + '.\n\n';
    }
    if (this.childrenType_ === this.categoryIdentifier_) {
      return this.getConfigurationInstructionsStringForCategoryChildren_(prefix);
    } else {
      return this.getConfigurationInstructionsStringForSettingsChildren_(prefix, bot, msg, settings, desiredFullyQualifiedName);
    }
  }

  getFullyQualifiedName() {
    return this.fullyQualifiedName_;
  }

  getUnqualifiedName() {
    return this.name_;
  }

  getChildForRelativeQualifiedNameHelper_(relativeQualifiedName) {
    let childName = relativeQualifiedName.split(this.settingsCategorySeparator_)[0];
    if (childName) {
      for (let child of this.children_) {
        if (child.getUnqualifiedName() === childName) {
          return child;
        }
      }
    }
  }

  getRelativeQualifiedNameForChild_(relativeQualifiedName) {
    return relativeQualifiedName.split(this.settingsCategorySeparator_).slice(1).join(this.settingsCategorySeparator_);
  }

  getConfigurationInstructionsStringForCategoryChildren_(prefix) {
    let subCategories = this.children_.map(child => child.getFullyQualifiedName());
    let subCategoryListString = subCategories.map(subCategory => '  ' + subCategory).join('\n');
    let titleString;
    if (this.isTopLevel_) {
      titleString = 'Settings categories';
    } else {
      titleString = 'Sub-categories under ' + this.fullyQualifiedName_;
    }
    return prefix + `
\`\`\`glsl
# ${titleString}

${subCategoryListString}

Say ']settings [category name]' to view and set that category's settings. For example: ]settings ${subCategories[0]}
\`\`\`
`;
  }

  getConfigurationInstructionsStringForSettingsChildren_(prefix, bot, msg, settings, desiredFullyQualifiedName) {
    debugger;
    let exampleSetting = this.children_[0].getFullyQualifiedName();
    let exampleValue = this.children_[0].getUserFacingExampleValue(bot, msg);
    let settingsListString = this.children_
      .map(child => '  ' + child.getFullyQualifiedName() + ' -> ' + child.getCurrentUserFacingValue(bot, msg, settings)).join('\n');
    let titleString;
    if (this.isTopLevel_) {
      titleString = 'Settings';
    } else {
      titleString = `Settings under '${this.fullyQualifiedName_}'`;
    }
    return prefix + `
\`\`\`md
# ${titleString}

${settingsListString}


# Say ']settings [setting]' to get more information about that setting, including allowed values.
    Example: ]setting ${exampleSetting}
# Say ']settings [setting] [value]' to set a setting in this channel.
    Example: ]settings ${exampleSetting} ${exampleValue}
# Say ']settings [setting] [value] --all' to set a setting server-wide.
    Example: ]settings ${exampleSetting} ${exampleValue} --all
# Say ']settings [setting] [value] #channel1 #channel2 #channelx' to set a setting on specific channels.
    Example: ]settings ${exampleSetting} ${exampleValue} #welcome #general
\`\`\`
`;
  }
}

module.exports = SettingsCategory;
