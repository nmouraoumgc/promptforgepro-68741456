import React from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import en from 'date-fns/locale/en';

const VersionHistory = () => {
    const { t, i18n } = useTranslation();
    const isEnglish = i18n.language === 'en';

    return (
        <div>
            <h1>{t('versionHistory.title')}</h1>
            <p>{t('versionHistory.authRequired')}</p>
            <p>{t('versionHistory.noVersions')}</p>
            <p>{t('versionHistory.createVersions')}</p>
            <p>{isEnglish ? 'Version' : t('versionHistory.version')}</p>
            <p>{t('versionHistory.current')}</p>
            <button>{t('versionHistory.revert')}</button>
            <p>{format(new Date(), { locale: isEnglish ? en : undefined })}</p>
        </div>
    );
};

export default VersionHistory;