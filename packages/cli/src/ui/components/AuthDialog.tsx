/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../colors.js';
import { RadioButtonSelect } from './shared/RadioButtonSelect.js';
import { LoadedSettings, SettingScope } from '../../config/settings.js';
import { AuthType } from 'daili-code-core';
import { validateAuthMethod } from '../../config/auth.js';

interface AuthDialogProps {
  onSelect: (authMethod: AuthType | undefined, scope: SettingScope) => void;
  settings: LoadedSettings;
  initialErrorMessage?: string | null;
}

export function AuthDialog({
  onSelect,
  settings,
  initialErrorMessage,
}: AuthDialogProps): React.JSX.Element {
  const [errorMessage, setErrorMessage] = useState<string | null>(() => {
    if (initialErrorMessage) return initialErrorMessage;
    if (process.env.DAILICODE_API_KEY) {
      return 'Existing API key detected (DAILICODE_API_KEY). Select "DailiCode API Key" option to use it.';
    }
    if (process.env.GEMINI_API_KEY) {
      return 'Existing API key detected (GEMINI_API_KEY). Select "Gemini API Key" option to use it.';
    }
    return null;
  });

  const items = [
    {
      label: 'Login with Google',
      value: AuthType.LOGIN_WITH_GOOGLE,
    },
    // 这是你新增的 DailiCode 选项
    {
      label: 'Use DailiCode API Key',
      value: AuthType.USE_DAILICODE, // 假设这是你新增的 AuthType
    },
    ...(process.env.CLOUD_SHELL === 'true'
      ? [
          {
            label: 'Use Cloud Shell user credentials',
            value: AuthType.CLOUD_SHELL,
          },
        ]
      : []),
    {
      label: 'Use Gemini API Key',
      value: AuthType.USE_GEMINI,
    },
    
  ];

  const initialAuthIndex = items.findIndex((item) => {
    if (settings.merged.selectedAuthType) {
      return item.value === settings.merged.selectedAuthType;
    }
    // 优先选择 DailiCode
    if (process.env.DAILICODE_API_KEY) {
        return item.value === AuthType.USE_DAILICODE;
    }
    if (process.env.GEMINI_API_KEY) {
      return item.value === AuthType.USE_GEMINI;
    }
    // 默认回退到 Google 登录
    return item.value === AuthType.LOGIN_WITH_GOOGLE;
  });

  const handleAuthSelect = (authMethod: AuthType) => {
    const error = validateAuthMethod(authMethod);
    if (error) {
      setErrorMessage(error);
    } else {
      setErrorMessage(null);
      onSelect(authMethod, SettingScope.User);
    }
  };

  useInput((_input, key) => {
    if (key.escape) {
      // Prevent exit if there is an error message.
      // This means they user is not authenticated yet.
      if (errorMessage) {
        return;
      }
      if (settings.merged.selectedAuthType === undefined) {
        // Prevent exiting if no auth method is set
        setErrorMessage(
          'You must select an auth method to proceed. Press Ctrl+C twice to exit.',
        );
        return;
      }
      onSelect(undefined, SettingScope.User);
    }
  });

  return (
    <Box
      borderStyle="round"
      borderColor={Colors.Gray}
      flexDirection="column"
      padding={1}
      width="100%"
    >
      <Text bold>Get started</Text>
      <Box marginTop={1}>
        <Text>How would you like to authenticate for this project?</Text>
      </Box>
      <Box marginTop={1}>
        <RadioButtonSelect
          items={items}
          initialIndex={initialAuthIndex}
          onSelect={handleAuthSelect}
          isFocused={true}
        />
      </Box>
      {errorMessage && (
        <Box marginTop={1}>
          <Text color={Colors.AccentRed}>{errorMessage}</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text color={Colors.Gray}>(Use Enter to select)</Text>
      </Box>
      <Box marginTop={1}>
        <Text>Terms of Services and Privacy Notice for DailiCode CLI</Text>
      </Box>
      <Box marginTop={1}>
        <Text color={Colors.AccentBlue}>
          {
            'https://github.com/nearmetips/DailiCode/blob/main/docs/tos-privacy.md'
          }
        </Text>
      </Box>
    </Box>
  );
}