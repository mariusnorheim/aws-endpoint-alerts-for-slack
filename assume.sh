#!/bin/bash

#Required
ACCOUNT=$1
#Optional
ROLE=$2

#If no role is passed along, use the adf-cloudforation-deployment-role
if [[ -z $ROLE ]]; then
    ROLE="adf-cloudformation-deployment-role"
fi

#This check is problaby not needed, but doesnt hurt
if [[ -z $ACCOUNT ]] || [[ -z $ROLE ]]; then
  >&2 echo "Error: invalid assume parameters"
  >&2 echo "You should invoke this script like: assume <account> <role>"
  >&2 echo "For example: assume 1234567890 myroletoassume"
  exit 1 
fi

set -e # Exit on error
#Assume the role, get the security creds to populate environs
CREDENTIALS=$(aws sts assume-role --role-arn "arn:aws:iam::${ACCOUNT}:role/${ROLE}" --role-session-name $(date +%s))
AWS_ACCESS_KEY_ID=$(echo "${CREDENTIALS}" | jq -r .Credentials.AccessKeyId)
AWS_SECRET_ACCESS_KEY=$(echo "${CREDENTIALS}" | jq -r .Credentials.SecretAccessKey)
AWS_SESSION_TOKEN=$(echo "${CREDENTIALS}" | jq -r .Credentials.SessionToken)

echo '# Run this script through eval to execute exports:'
echo '# eval "$(./assume <account> <role>)"'
echo "export AWS_ACCESS_KEY_ID=\"$AWS_ACCESS_KEY_ID\""
echo "export AWS_SECRET_ACCESS_KEY=\"$AWS_SECRET_ACCESS_KEY\""
echo "export AWS_SESSION_TOKEN=\"$AWS_SESSION_TOKEN\""
