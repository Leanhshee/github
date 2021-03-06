import React from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import {CompositeDisposable} from 'atom';

import StagingView from './staging-view';
import GitLogo from './git-logo';
import CommitController from '../controllers/commit-controller';
import RecentCommitsController from '../controllers/recent-commits-controller';
import {isValidWorkdir, autobind} from '../helpers';
import {AuthorPropType} from '../prop-types';

export default class GitTabView extends React.Component {
  static focus = {
    ...StagingView.focus,
    ...CommitController.focus,
    ...RecentCommitsController.focus,
  };

  static propTypes = {
    repository: PropTypes.object.isRequired,
    isLoading: PropTypes.bool.isRequired,

    lastCommit: PropTypes.object.isRequired,
    currentBranch: PropTypes.object,
    recentCommits: PropTypes.arrayOf(PropTypes.object).isRequired,
    isMerging: PropTypes.bool,
    isRebasing: PropTypes.bool,
    hasUndoHistory: PropTypes.bool,
    unstagedChanges: PropTypes.arrayOf(PropTypes.object),
    stagedChanges: PropTypes.arrayOf(PropTypes.object),
    mergeConflicts: PropTypes.arrayOf(PropTypes.object),
    workingDirectoryPath: PropTypes.string,
    mergeMessage: PropTypes.string,
    mentionableUsers: PropTypes.arrayOf(AuthorPropType),
    selectedCoAuthors: PropTypes.arrayOf(AuthorPropType),
    updateSelectedCoAuthors: PropTypes.func.isRequired,

    workspace: PropTypes.object.isRequired,
    commandRegistry: PropTypes.object.isRequired,
    grammars: PropTypes.object.isRequired,
    resolutionProgress: PropTypes.object.isRequired,
    notificationManager: PropTypes.object.isRequired,
    config: PropTypes.object.isRequired,
    project: PropTypes.object.isRequired,
    tooltips: PropTypes.object.isRequired,

    initializeRepo: PropTypes.func.isRequired,
    abortMerge: PropTypes.func.isRequired,
    commit: PropTypes.func.isRequired,
    undoLastCommit: PropTypes.func.isRequired,
    prepareToCommit: PropTypes.func.isRequired,
    resolveAsOurs: PropTypes.func.isRequired,
    resolveAsTheirs: PropTypes.func.isRequired,
    undoLastDiscard: PropTypes.func.isRequired,
    attemptStageAllOperation: PropTypes.func.isRequired,
    attemptFileStageOperation: PropTypes.func.isRequired,
    discardWorkDirChangesForPaths: PropTypes.func.isRequired,
    openFiles: PropTypes.func.isRequired,
  };

  constructor(props, context) {
    super(props, context);
    autobind(this, 'initializeRepo', 'blur', 'advanceFocus', 'retreatFocus', 'quietlySelectItem');

    this.subscriptions = new CompositeDisposable();

    this.refRoot = null;
    this.refStagingView = null;
    this.refCommitViewComponent = null;
  }

  componentDidMount() {
    this.subscriptions.add(
      this.props.commandRegistry.add(this.refRoot, {
        'tool-panel:unfocus': this.blur,
        'core:focus-next': this.advanceFocus,
        'core:focus-previous': this.retreatFocus,
      }),
    );
  }

  render() {
    if (this.props.repository.isTooLarge()) {
      return (
        <div className="github-Panel is-empty" tabIndex="-1" ref={c => { this.refRoot = c; }}>
          <div ref="noRepoMessage" className="github-Panel no-repository">
            <div className="large-icon">
              <GitLogo />
            </div>
            <h3>Too many changes</h3>
            <div className="initialize-repo-description">
              The repository at <strong>{this.props.workingDirectoryPath}</strong> has too many changed files
              to display in Atom. Ensure that you have set up an appropriate <code>.gitignore</code> file.
            </div>
          </div>
        </div>
      );
    } else if (this.props.repository.hasDirectory() &&
               !isValidWorkdir(this.props.repository.getWorkingDirectoryPath())) {
      return (
        <div className="github-Panel is-empty" tabIndex="-1" ref={c => { this.refRoot = c; }}>
          <div ref="noRepoMessage" className="github-Panel no-repository">
            <div className="large-icon">
              <GitLogo />
            </div>
            <h3>Unsupported directory</h3>
            <div className="initialize-repo-description">
              Atom does not support managing Git repositories in your home or root directories.
            </div>
          </div>
        </div>
      );
    } else if (this.props.repository.showGitTabInit()) {
      const inProgress = this.props.repository.showGitTabInitInProgress();
      const message = this.props.repository.hasDirectory()
        ?
        (
          <span>Initialize <strong>{this.props.workingDirectoryPath}</strong> with a
          Git repository</span>
        )
        : <span>Initialize a new project directory with a Git repository</span>;

      return (
        <div className="github-Panel is-empty" tabIndex="-1" ref={c => { this.refRoot = c; }}>
          <div ref="noRepoMessage" className="github-Panel no-repository">
            <div className="large-icon">
              <GitLogo />
            </div>
            <div className="initialize-repo-description">{message}</div>
            <button onClick={this.initializeRepo} disabled={inProgress} className="btn btn-primary">
              {inProgress ? 'Creating repository...' : 'Create repository'}
            </button>
          </div>
        </div>
      );
    } else {
      const isLoading = this.props.isLoading || this.props.repository.showGitTabLoading();

      return (
        <div
          className={cx('github-Panel', {'is-loading': isLoading})}
          tabIndex="-1"
          ref={c => { this.refRoot = c; }}>
          <StagingView
            ref={c => { this.refStagingView = c; }}
            commandRegistry={this.props.commandRegistry}
            notificationManager={this.props.notificationManager}
            workspace={this.props.workspace}
            stagedChanges={this.props.stagedChanges}
            unstagedChanges={this.props.unstagedChanges}
            mergeConflicts={this.props.mergeConflicts}
            workingDirectoryPath={this.props.workingDirectoryPath}
            resolutionProgress={this.props.resolutionProgress}
            openFiles={this.props.openFiles}
            discardWorkDirChangesForPaths={this.props.discardWorkDirChangesForPaths}
            attemptFileStageOperation={this.props.attemptFileStageOperation}
            attemptStageAllOperation={this.props.attemptStageAllOperation}
            undoLastDiscard={this.props.undoLastDiscard}
            abortMerge={this.props.abortMerge}
            resolveAsOurs={this.props.resolveAsOurs}
            resolveAsTheirs={this.props.resolveAsTheirs}
            lastCommit={this.props.lastCommit}
            isLoading={this.props.isLoading}
            hasUndoHistory={this.props.hasUndoHistory}
            isMerging={this.props.isMerging}
          />
          <CommitController
            ref={c => { this.refCommitController = c; }}
            tooltips={this.props.tooltips}
            config={this.props.config}
            stagedChangesExist={this.props.stagedChanges.length > 0}
            mergeConflictsExist={this.props.mergeConflicts.length > 0}
            prepareToCommit={this.props.prepareToCommit}
            commit={this.props.commit}
            abortMerge={this.props.abortMerge}
            currentBranch={this.props.currentBranch}
            workspace={this.props.workspace}
            commandRegistry={this.props.commandRegistry}
            notificationManager={this.props.notificationManager}
            grammars={this.props.grammars}
            mergeMessage={this.props.mergeMessage}
            isMerging={this.props.isMerging}
            isLoading={this.props.isLoading}
            lastCommit={this.props.lastCommit}
            repository={this.props.repository}
            mentionableUsers={this.props.mentionableUsers}
            selectedCoAuthors={this.props.selectedCoAuthors}
            updateSelectedCoAuthors={this.props.updateSelectedCoAuthors}
          />
          <RecentCommitsController
            ref={c => { this.refRecentCommitController = c; }}
            commits={this.props.recentCommits}
            isLoading={this.props.isLoading}
            undoLastCommit={this.props.undoLastCommit}
          />
        </div>
      );
    }
  }

  componentWillUnmount() {
    this.subscriptions.dispose();
  }

  initializeRepo(event) {
    event.preventDefault();
    let initPath = null;
    const activeEditor = this.props.workspace.getActiveTextEditor();
    if (activeEditor) {
      const [projectPath] = this.props.project.relativizePath(activeEditor.getPath());
      if (projectPath) {
        initPath = projectPath;
      }
    }
    this.props.initializeRepo(initPath);
  }

  rememberFocus(event) {
    let currentFocus = null;

    if (this.refStagingView) {
      currentFocus = this.refStagingView.rememberFocus(event);
    }

    if (!currentFocus && this.refCommitController) {
      currentFocus = this.refCommitController.rememberFocus(event);
    }

    return currentFocus;
  }

  setFocus(focus) {
    if (this.refStagingView) {
      if (this.refStagingView.setFocus(focus)) {
        return true;
      }
    }

    if (this.refCommitController) {
      if (this.refCommitController.setFocus(focus)) {
        return true;
      }
    }

    return false;
  }

  blur() {
    this.props.workspace.getActivePane().activate();
  }

  async advanceFocus(evt) {
    // The commit controller manages its own focus
    if (this.refCommitController.hasFocus()) { return; }
    if (await this.refStagingView.activateNextList()) {
      evt.stopPropagation();
    } else {
      if (this.refCommitController.setFocus(GitTabView.focus.EDITOR)) {
        evt.stopPropagation();
      }
    }
  }

  async retreatFocus(evt) {
    const stagingView = this.refStagingView;
    const commitController = this.refCommitController;

    if (commitController.hasFocus()) {
      // if the commit editor is focused, focus the last staging view list
      if (commitController.hasFocusEditor() && await stagingView.activateLastList()) {
        this.setFocus(GitTabView.focus.STAGING);
        evt.stopPropagation();
      }
    } else {
      await stagingView.activatePreviousList();
      evt.stopPropagation();
    }
  }

  async focusAndSelectStagingItem(filePath, stagingStatus) {
    await this.refStagingView.quietlySelectItem(filePath, stagingStatus);
    this.setFocus(GitTabView.focus.STAGING);
  }

  hasFocus() {
    return this.refRoot.contains(document.activeElement);
  }

  quietlySelectItem(filePath, stagingStatus) {
    return this.refStagingView.quietlySelectItem(filePath, stagingStatus);
  }
}
