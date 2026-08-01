import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import InputAdornment from '@mui/material/InputAdornment';
import TextField, { type TextFieldProps } from '@mui/material/TextField';
import { forwardRef, useState } from 'react';

import { AppIconButton } from '../../ui/actions/AppIconButton';

type PasswordFieldProps = Omit<TextFieldProps, 'type'>;

export const PasswordField = forwardRef<HTMLDivElement, PasswordFieldProps>(function PasswordField(
  props,
  ref,
) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      {...props}
      ref={ref}
      type={visible ? 'text' : 'password'}
      InputProps={{
        ...props.InputProps,
        endAdornment: (
          <InputAdornment position="end">
            <AppIconButton
              label={visible ? 'Hide password' : 'Show password'}
              edge="end"
              onClick={() => setVisible((current) => !current)}
            >
              {visible ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
            </AppIconButton>
          </InputAdornment>
        ),
      }}
    />
  );
});
