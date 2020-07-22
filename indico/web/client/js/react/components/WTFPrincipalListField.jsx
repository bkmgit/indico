// This file is part of Indico.
// Copyright (C) 2002 - 2020 CERN
//
// Indico is free software; you can redistribute it and/or
// modify it under the terms of the MIT License; see the
// LICENSE file for more details.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import PropTypes from 'prop-types';
import {PrincipalListField} from 'indico/react/components/principals';
import {useFavoriteUsers} from 'indico/react/hooks';

export function WTFPrincipalListField({fieldId, defaultValue, protectedFieldId, ...otherProps}) {
  const favoriteUsersController = useFavoriteUsers();
  const protectedField = useMemo(
    () => protectedFieldId && document.getElementById(protectedFieldId),
    [protectedFieldId]
  );
  const inputField = useMemo(() => document.getElementById(fieldId), [fieldId]);
  const [value, setValue] = useState(defaultValue);
  const [disabled, setDisabled] = useState(!!protectedField && !protectedField.checked);

  useEffect(() => {
    if (!protectedField) {
      return;
    }
    const onChangeProtected = () => {
      setDisabled(!protectedField.checked);
    };
    protectedField.addEventListener('change', onChangeProtected);
    return () => protectedField.removeEventListener('change', onChangeProtected);
  }, [protectedField]);

  const onChangePrincipal = useCallback(
    principals => {
      inputField.value = JSON.stringify(principals);
      setValue(principals);
      inputField.dispatchEvent(new Event('change'));
    },
    [inputField]
  );

  return (
    <PrincipalListField
      favoriteUsersController={favoriteUsersController}
      disabled={disabled}
      onChange={onChangePrincipal}
      onFocus={() => {}}
      onBlur={() => {}}
      value={value}
      {...otherProps}
    />
  );
}

WTFPrincipalListField.propTypes = {
  fieldId: PropTypes.string.isRequired,
  defaultValue: PropTypes.arrayOf(PropTypes.string),
  protectedFieldId: PropTypes.string,
};

WTFPrincipalListField.defaultProps = {
  defaultValue: [],
  protectedFieldId: null,
};